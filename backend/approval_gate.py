#!/usr/bin/env python3
"""
Approval Gate — AgentOS capital lock runtime module.
Usage: from agents.shared.approval_gate import require_approval
"""

import time
import uuid
from pathlib import Path
from typing import Dict, Optional

# Default threshold in ZAR
DEFAULT_THRESHOLD = 5000

# Telegram owner target for approval routing
TELEGRAM_OWNER_ID = "6521797508"

# Build Charger Engine split (SmartBiz durable rule): 50% / 30% / 8.55%
# Remainder (~11.45%) is retained as platform reserve.
BUILD_CHARGER_SPLIT = {
    "charger_engine": 0.50,
    "operations": 0.30,
    "dividend": 0.0855,
}
BUILD_CHARGER_LABELS = {
    "charger_engine": "Build Charger Engine",
    "operations": "Operations",
    "dividend": "Dividend",
}

# In-memory store; mirrored to persistent ledger files (see _append_ledger)
_pending: Dict[str, Dict] = {}
_decided: Dict[str, Dict] = {}

# Agents workspace root (agents/) — used to locate per-agent + mirrored ledgers
_AGENTS_ROOT = Path(__file__).resolve().parent.parent
_LEDGER_MIRROR = _AGENTS_ROOT / "memory" / "approval-ledger.md"


def build_request(agent: str, amount: float, description: str, risk: str = "", alternative: str = "", deadline: str = "") -> Dict:
    request_id = str(int(time.time() * 1000)) + "-" + uuid.uuid4().hex[:8]
    request = {
        "request_id": request_id,
        "agent": agent,
        "type": "financial",
        "amount": amount,
        "currency": "ZAR",
        "description": description,
        "risk": risk,
        "alternative": alternative,
        "deadline": deadline,
        "status": "PENDING",
        "created_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "owner_telegram_id": TELEGRAM_OWNER_ID,
    }
    _pending[request_id] = request
    _append_ledger(request, action="REQUEST")
    return request


def format_request(request: Dict) -> str:
    return (
        f"REQUEST_ID: {request['request_id']}\n"
        f"AGENT: {request['agent']}\n"
        f"TYPE: {request['type']}\n"
        f"AMOUNT: {request['amount']} {request['currency']}\n"
        f"DESCRIPTION: {request['description']}\n"
        f"RISK: {request['risk']}\n"
        f"ALTERNATIVE: {request['alternative']}\n"
        f"DEADLINE: {request['deadline']}\n"
    )


def compute_build_charger_split(amount: float) -> Dict[str, float]:
    """Apply the Build Charger Engine split (50/30/8.55) to an approved amount."""
    split = {k: round(amount * p, 2) for k, p in BUILD_CHARGER_SPLIT.items()}
    allocated = round(sum(split.values()), 2)
    split["reserve"] = round(amount - allocated, 2)  # platform reserve (~11.45%)
    return split


def decide(request_id: str, decision: str, reason: str = "") -> Optional[Dict]:
    request = _pending.get(request_id)
    if not request:
        return None
    approved = decision.upper().startswith("APPROVE")
    request["status"] = "APPROVED" if approved else "DENIED"
    request["reason"] = reason
    request["decided_at"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    if approved and request.get("amount"):
        request["split"] = compute_build_charger_split(float(request["amount"]))
    _decided[request_id] = request
    _pending.pop(request_id, None)
    _append_ledger(request, action=request["status"])
    return request


def timeout_expired(request: Dict, timeout_seconds: int = 86400) -> bool:
    age = time.time() - time.mktime(time.strptime(request["created_at"], "%Y-%m-%dT%H:%M:%SZ"))
    return age > timeout_seconds


def sweep_timeouts() -> Dict[str, Dict]:
    timed_out = {}
    expired = [rid for rid, req in _pending.items() if timeout_expired(req)]
    for rid in expired:
        req = _pending.pop(rid)
        req["status"] = "TIMEOUT"
        req["decided_at"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        _decided[rid] = req
        _append_ledger(req, action="TIMEOUT")
        timed_out[rid] = req
    return timed_out


def _append_ledger(request: Dict, action: str) -> None:
    """Persist an approval event to the mirrored ledger and the agent's own log.

    Mirrors agents/memory/approval-ledger.md (Orchestrator copy) and
    <agent>/memory/approval-log.md (per-agent workspace copy), per APPROVAL_POLICY.md.
    """
    ts = request.get("decided_at") or request.get("created_at", time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()))
    amount = request.get("amount", 0)
    line = f"{ts} | {request.get('request_id')} | {request.get('agent')} | {amount} ZAR | {action}"
    split = request.get("split")
    if split:
        parts = ", ".join(f"{k}={v}" for k, v in split.items())
        line += f" | split: {parts}"
    line += "\n"

    # Mirrored ledger (Orchestrator copy)
    try:
        _LEDGER_MIRROR.parent.mkdir(parents=True, exist_ok=True)
        with open(_LEDGER_MIRROR, "a", encoding="utf-8") as f:
            f.write(line)
    except OSError:
        pass

    # Per-agent workspace log
    try:
        agent_log = _AGENTS_ROOT / str(request.get("agent", "_unknown")) / "memory" / "approval-log.md"
        agent_log.parent.mkdir(parents=True, exist_ok=True)
        with open(agent_log, "a", encoding="utf-8") as f:
            f.write(line)
    except OSError:
        pass
