// Xero accounting sync — Cloudflare-native port of backend/xero_sync.js
// Uses Custom Connection OAuth2 client-credentials flow (machine-to-machine)
// No-op if credentials not configured; safe to import.

const _TOKEN_URL = "https://identity.xero.com/connect/token";
const _API = "https://api.xero.com/api.xro/2.0";

function _loadEnv(env) {
  // Pull from Cloudflare environment variables (set via wrangler pages secret put)
  const cfg = {};
  const keys = [
    "XERO_CLIENT_ID",
    "XERO_CLIENT_SECRET",
    "XERO_TENANT_ID",
    "XERO_SALES_ACCOUNT",
    "XERO_BANK_ACCOUNT",
  ];
  for (const k of keys) {
    if (env[k]) cfg[k] = env[k];
  }
  return cfg;
}

export function isConfigured(env) {
  const cfg = _loadEnv(env);
  return bool(cfg["XERO_CLIENT_ID"] && cfg["XERO_CLIENT_SECRET"] && cfg["XERO_TENANT_ID"]);
}

async function _getToken(env) {
  const cfg = _loadEnv(env);
  if (!cfg["XERO_CLIENT_ID"] || !cfg["XERO_CLIENT_SECRET"]) return null;

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    scopes: "accounting.transactions accounting.contacts",
  }).toString();

  const auth = btoa(`${cfg["XERO_CLIENT_ID"]}:${cfg["XERO_CLIENT_SECRET"]}`);
  try {
    const resp = await fetch(_TOKEN_URL, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    return data.access_token;
  } catch (err) {
    console.error("Xero token fetch failed:", err);
    return null;
  }
}

async function _api(method, path, token, tenant, payload = null, env) {
  const url = _API + path;
  const headers = {
    Authorization: `Bearer ${token}`,
    "Xero-Tenant-Id": tenant,
    Accept: "application/json",
    "Content-Type": "application/json",
  };
  const opts = { method, headers };
  if (payload !== null) {
    opts.body = JSON.stringify(payload);
  }
  try {
    const resp = await fetch(url, opts);
    if (!resp.ok) {
      const errTxt = await resp.text();
      return { error: `HTTP ${resp.status}: ${errTxt}` };
    }
    return await resp.json();
  } catch (err) {
    return { error: String(err) };
  }
}

export async function pushSettlement(env, { client, description, amount, reference = "", email = "" }) {
  if (!isConfigured(env)) return { synced: false, reason: "xero_not_configured" };

  const token = await _getToken(env);
  if (!token) return { synced: false, reason: "xero_auth_failed" };

  const cfg = _loadEnv(env);
  const tenant = cfg["XERO_TENANT_ID"];
  const salesAcct = cfg["XERO_SALES_ACCOUNT"] || "200";

  // Build contact
  const contact = { Name: client || "PropUber Client" };
  if (email) contact.EmailAddress = email;

  // Build invoice
  const invoice = {
    Type: "ACCREC",
    Contact: contact,
    LineItems: [{
      Description: description || "PropUber service",
      Quantity: 1.0,
      UnitAmount: Math.round(parseFloat(amount) * 100) / 100,
      AccountCode: salesAcct,
    }],
    Reference: reference,
    Status: "AUTHORISED",
    Date: new Date().toISOString().split("T")[0],
    DueDate: new Date().toISOString().split("T")[0],
    CurrencyCode: "ZAR",
  };

  // Create invoice
  const createResp = await _api("POST", "/Invoices", token, tenant, { Invoices: [invoice] }, env);
  if (!createResp || createResp.error || !createResp.Invoices || !createResp.Invoices.length) {
    return {
      synced: false,
      reason: "invoice_create_failed",
      detail: createResp,
    };
  }

  const inv = createResp.Invoices[0];
  const invId = inv.InvoiceID;

  // Mark paid if bank account configured
  const bankAcct = cfg["XERO_BANK_ACCOUNT"];
  let paid = false;
  if (bankAcct && invId) {
    const payment = {
      Payments: [{
        Invoice: { InvoiceID: invId },
        Account: { Code: bankAcct },
        Date: new Date().toISOString().split("T")[0],
        Amount: Math.round(parseFloat(amount) * 100) / 100,
        Reference: reference,
      }],
    };
    const payResp = await _api("PUT", "/Payments", token, tenant, payment, env);
    paid = !payResp.error && Boolean(payResp.Payments && payResp.Payments.length);
  }

  return {
    synced: true,
    invoice_id: invId,
    invoice_number: inv.InvoiceNumber,
    paid,
  };
}

// Helper for boolean conversion
function bool(v) { return !!v; }