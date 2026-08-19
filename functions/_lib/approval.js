// Approval Gate — Cloudflare-native port of backend/approval_gate.py
// Hard Handshake: R5k threshold, 50/30/8.55 split, owner-only decision via Telegram

const DEFAULT_THRESHOLD = 5000;
const TELEGRAM_OWNER_ID = "6521797508";

const BUILD_CHARGER_SPLIT = {
  charger_engine: 0.50,
  operations: 0.30,
  dividend: 0.0855,
};
const BUILD_CHARGER_LABELS = {
  charger_engine: "Build Charger Engine",
  operations: "Operations",
  dividend: "Dividend",
};

// In-memory store (per-request lifetime; KV persistence added below)
const _pending = new Map();
const _decided = new Map();

// KV key prefixes
const PENDING_PREFIX = "approval:pending:";
const DECIDED_PREFIX = "approval:decided:";
const LEDGER_KEY = "approval:ledger";

function buildRequest({ agent, amount, description, risk = "", alternative = "", deadline = "" }) {
  const request_id = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
  const request = {
    request_id,
    agent,
    type: "financial",
    amount: Number(amount),
    currency: "ZAR",
    description,
    risk,
    alternative,
    deadline,
    status: "PENDING",
    created_at: new Date().toISOString(),
    owner_telegram_id: TELEGRAM_OWNER_ID,
  };
  _pending.set(request_id, request);
  return request;
}

function formatRequest(request) {
  return (
    `REQUEST_ID: ${request.request_id}\n` +
    `AGENT: ${request.agent}\n` +
    `TYPE: ${request.type}\n` +
    `AMOUNT: ${request.amount} ${request.currency}\n` +
    `DESCRIPTION: ${request.description}\n` +
    `RISK: ${request.risk}\n` +
    `ALTERNATIVE: ${request.alternative}\n` +
    `DEADLINE: ${request.deadline}\n`
  );
}

function computeBuildChargerSplit(amount) {
  const split = {};
  for (const [k, p] of Object.entries(BUILD_CHARGER_SPLIT)) {
    split[k] = Math.round(amount * p * 100) / 100;
  }
  const allocated = Math.round(Object.values(split).reduce((a, b) => a + b, 0) * 100) / 100;
  split.reserve = Math.round((amount - allocated) * 100) / 100; // ~11.45%
  return split;
}

async function decide(request_id, decision, reason = "", env) {
  const request = _pending.get(request_id) || (await loadDecided(env, request_id)) || (await loadPending(env, request_id));
  if (!request) return null;

  const approved = String(decision).toUpperCase().startsWith("APPROVE");
  request.status = approved ? "APPROVED" : "DENIED";
  request.reason = reason;
  request.decided_at = new Date().toISOString();

  if (approved && request.amount) {
    request.split = computeBuildChargerSplit(Number(request.amount));
  }

  _pending.delete(request_id);
  _decided.set(request_id, request);

  // Persist to KV
  await persistDecision(env, request);
  await appendLedger(env, request, request.status);

  return request;
}

function timeoutExpired(request, timeoutSeconds = 86400) {
  const created = new Date(request.created_at).getTime();
  return (Date.now() - created) > timeoutSeconds * 1000;
}

async function sweepTimeouts(env) {
  const timedOut = {};
  for (const [rid, req] of _pending) {
    if (timeoutExpired(req)) {
      req.status = "TIMEOUT";
      req.decided_at = new Date().toISOString();
      _pending.delete(rid);
      _decided.set(rid, req);
      await persistDecision(env, req);
      await appendLedger(env, req, "TIMEOUT");
      timedOut[rid] = req;
    }
  }
  return timedOut;
}

async function loadPending(env, request_id) {
  const kv = env.CASH;
  const val = await kv.get(PENDING_PREFIX + request_id);
  if (val) {
    const req = JSON.parse(val);
    _pending.set(request_id, req);
    return req;
  }
  return null;
}

async function loadDecided(env, request_id) {
  const kv = env.CASH;
  const val = await kv.get(DECIDED_PREFIX + request_id);
  if (val) {
    const req = JSON.parse(val);
    _decided.set(request_id, req);
    return req;
  }
  return null;
}

async function persistDecision(env, request) {
  const kv = env.CASH;
  const key = request.status === "PENDING" ? PENDING_PREFIX : DECIDED_PREFIX;
  await kv.put(key + request.request_id, JSON.stringify(request));
}

async function appendLedger(env, request, action) {
  const kv = env.CASH;
  const ts = request.decided_at || request.created_at;
  const amount = request.amount || 0;
  let line = `${ts} | ${request.request_id} | ${request.agent} | ${amount} ZAR | ${action}`;
  if (request.split) {
    const parts = Object.entries(request.split).map(([k, v]) => `${k}=${v}`).join(", ");
    line += ` | split: ${parts}`;
  }
  line += "\n";

  // Append to ledger (KV doesn't have append; read-modify-write)
  const existing = (await kv.get(LEDGER_KEY)) || "";
  await kv.put(LEDGER_KEY, existing + line);
}

async function getQueue(env) {
  // Load from KV if memory is empty
  if (_pending.size === 0) {
    const kv = env.CASH;
    const list = await kv.list({ prefix: PENDING_PREFIX });
    for (const k of list.keys) {
      const val = await kv.get(k.name);
      if (val) {
        const req = JSON.parse(val);
        _pending.set(req.request_id, req);
      }
    }
    const dlist = await kv.list({ prefix: DECIDED_PREFIX });
    for (const k of dlist.keys) {
      const val = await kv.get(k.name);
      if (val) {
        const req = JSON.parse(val);
        _decided.set(req.request_id, req);
      }
    }
  }

  const pending = Array.from(_pending.values());
  const decided = Array.from(_decided.values());
  return {
    pending: pending.length,
    decided: decided.length,
    pending_items: pending,
    decided_items: decided,
  };
}

function previewSplit(amount) {
  return { amount: Number(amount), split: computeBuildChargerSplit(Number(amount)) };
}

export {
  DEFAULT_THRESHOLD,
  TELEGRAM_OWNER_ID,
  BUILD_CHARGER_SPLIT,
  BUILD_CHARGER_LABELS,
  buildRequest,
  formatRequest,
  computeBuildChargerSplit,
  decide,
  timeoutExpired,
  sweepTimeouts,
  getQueue,
  previewSplit,
  loadPending,
  loadDecided,
};