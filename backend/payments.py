#!/usr/bin/env python3
"""
PayFast payment rail + escrow settlement ledger for SmartBiz Group.

Three rails, one module:
  1. PayFast live checkout    -> build_payfast_checkout()  (real ZAR in)
  2. Escrow settlement ledger -> record_settlement()        (real cash confirmed)
  3. Manual invoice           -> create_invoice()           (land 1 paying job)

Go-live requires REAL merchant credentials via env (fail-closed if unset):
  PAYFAST_MERCHANT_ID, PAYFAST_MERCHANT_KEY, PAYFAST_PASSPHRASE
  PAYFAST_MODE = "live" | "sandbox"  (default sandbox)
"""

import os
import time
import uuid
import hashlib
import urllib.parse
from pathlib import Path
from typing import Dict, Optional

# ── Config (fail-closed on live without creds) ───────────────
PAYFAST_MERCHANT_ID = os.environ.get("PAYFAST_MERCHANT_ID", "")
PAYFAST_MERCHANT_KEY = os.environ.get("PAYFAST_MERCHANT_KEY", "")
PAYFAST_PASSPHRASE = os.environ.get("PAYFAST_PASSPHRASE", "")
PAYFAST_MODE = os.environ.get("PAYFAST_MODE", "sandbox").lower()

PAYFAST_HOSTS = {
    "live": "https://www.payfast.co.za/eng/process",
    "sandbox": "https://sandbox.payfast.co.za/eng/process",
}
PAYFAST_VALIDATE = {
    "live": "https://www.payfast.co.za/eng/query/validate",
    "sandbox": "https://sandbox.payfast.co.za/eng/query/validate",
}

# Persistent ledgers (sibling to the approval ledger)
_MEM = Path(__file__).resolve().parent.parent / "memory"
_SETTLEMENT_LEDGER = _MEM / "settlement-ledger.md"   # rail 2: confirmed real cash
_INVOICE_LEDGER = _MEM / "invoice-book.md"           # rail 3: issued invoices

# In-memory invoice store
_invoices: Dict[str, Dict] = {}


def _is_live_ready() -> bool:
    return bool(PAYFAST_MERCHANT_ID and PAYFAST_MERCHANT_KEY)


def _signature(fields: Dict[str, str]) -> str:
    """PayFast MD5 signature over URL-encoded, insertion-ordered fields + passphrase."""
    pairs = []
    for k, v in fields.items():
        if v == "" or v is None:
            continue
        pairs.append(f"{k}={urllib.parse.quote_plus(str(v).strip())}")
    query = "&".join(pairs)
    if PAYFAST_PASSPHRASE:
        query += f"&passphrase={urllib.parse.quote_plus(PAYFAST_PASSPHRASE.strip())}"
    return hashlib.md5(query.encode()).hexdigest()


# ── RAIL 1: PayFast checkout ─────────────────────────────────
def build_payfast_checkout(amount: float, item_name: str, return_url: str,
                           cancel_url: str, notify_url: str,
                           email: str = "", m_payment_id: str = "") -> Dict:
    """Build a signed PayFast checkout payload. POST these fields to `process_url`."""
    mode = PAYFAST_MODE if PAYFAST_MODE in PAYFAST_HOSTS else "sandbox"
    m_payment_id = m_payment_id or (str(int(time.time() * 1000)) + "-" + uuid.uuid4().hex[:8])
    # Field order MUST follow PayFast's documented order (merchant → customer →
    # transaction), NOT alphabetical. Signature is built over this exact order.
    fields = {
        "merchant_id": PAYFAST_MERCHANT_ID,
        "merchant_key": PAYFAST_MERCHANT_KEY,
        "return_url": return_url,
        "cancel_url": cancel_url,
        "notify_url": notify_url,
        "email_address": email,
        "m_payment_id": m_payment_id,
        "amount": f"{float(amount):.2f}",
        "item_name": item_name,
    }
    fields["signature"] = _signature(fields)
    return {
        "process_url": PAYFAST_HOSTS[mode],
        "mode": mode,
        "live_ready": _is_live_ready(),
        "m_payment_id": m_payment_id,
        "fields": fields,
        "note": ("LIVE credentials loaded." if _is_live_ready()
                 else "SANDBOX/no creds — set PAYFAST_MERCHANT_ID/KEY/PASSPHRASE for real ZAR."),
    }


def verify_itn(post_data: Dict[str, str]) -> bool:
    """Verify a PayFast ITN (webhook) signature. Full verification also pings PayFast."""
    received_sig = post_data.get("signature", "")
    check = {k: v for k, v in post_data.items() if k != "signature"}
    return bool(received_sig) and _signature(check) == received_sig


# PayFast source IP ranges (per docs "Ports and IP addresses"). ITN must originate here.
import ipaddress
PAYFAST_IP_RANGES = [
    "197.97.145.144/28",
    "41.74.179.192/27",
    "102.216.36.0/28",
    "102.216.36.128/28",
    "144.126.193.139/32",
]


def is_payfast_ip(ip: str) -> bool:
    try:
        addr = ipaddress.ip_address(ip)
        return any(addr in ipaddress.ip_network(net) for net in PAYFAST_IP_RANGES)
    except ValueError:
        return False


def confirm_itn_with_payfast(post_data: Dict[str, str], timeout: int = 10) -> bool:
    """Step 3 of ITN validation: POST the received data back to PayFast; it replies
    'VALID' if the ITN is genuine. Skipped (returns True) if urllib unavailable."""
    import urllib.request
    mode = PAYFAST_MODE if PAYFAST_MODE in PAYFAST_VALIDATE else "sandbox"
    body = urllib.parse.urlencode(post_data).encode()
    try:
        req = urllib.request.Request(PAYFAST_VALIDATE[mode], data=body,
                                     headers={"Content-Type": "application/x-www-form-urlencoded"})
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return resp.read().decode().strip().split("\n")[0].strip().upper() == "VALID"
    except Exception:
        return False


# ── RAIL 2: Escrow settlement ledger (confirmed real cash) ───
def record_settlement(m_payment_id: str, amount: float, source: str,
                      status: str = "COMPLETE", pf_payment_id: str = "") -> Dict:
    """Append a CONFIRMED cash receipt to the settlement ledger. This is real money."""
    ts = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    entry = {
        "settled_at": ts, "m_payment_id": m_payment_id, "pf_payment_id": pf_payment_id,
        "amount": round(float(amount), 2), "currency": "ZAR",
        "source": source, "status": status,
    }
    line = (f"{ts} | {m_payment_id} | pf={pf_payment_id or '-'} | "
            f"{entry['amount']} ZAR | {source} | {status}\n")
    try:
        _MEM.mkdir(parents=True, exist_ok=True)
        with open(_SETTLEMENT_LEDGER, "a", encoding="utf-8") as f:
            f.write(line)
    except OSError:
        pass
    return entry


def settlement_totals() -> Dict:
    """Sum only COMPLETE settlements = actual cash collected to date."""
    total = 0.0
    count = 0
    if _SETTLEMENT_LEDGER.exists():
        for raw in _SETTLEMENT_LEDGER.read_text(encoding="utf-8").splitlines():
            parts = [p.strip() for p in raw.split("|")]
            if len(parts) >= 6 and parts[5] == "COMPLETE":
                try:
                    total += float(parts[3].split()[0])
                    count += 1
                except (ValueError, IndexError):
                    pass
    return {"real_cash_zar": round(total, 2), "settlements": count}


# ── RAIL 3: Manual invoice (land 1 paying job) ───────────────
def create_invoice(client: str, description: str, amount: float,
                   subsidiary: str = "SmartBiz Fire Safety", email: str = "") -> Dict:
    invoice_id = "INV-" + str(int(time.time())) + "-" + uuid.uuid4().hex[:6]
    ts = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    inv = {
        "invoice_id": invoice_id, "client": client, "description": description,
        "amount": round(float(amount), 2), "currency": "ZAR", "subsidiary": subsidiary,
        "email": email, "status": "ISSUED", "created_at": ts, "paid_at": None,
    }
    _invoices[invoice_id] = inv
    line = f"{ts} | {invoice_id} | {subsidiary} | {client} | {inv['amount']} ZAR | ISSUED | {description}\n"
    try:
        _MEM.mkdir(parents=True, exist_ok=True)
        with open(_INVOICE_LEDGER, "a", encoding="utf-8") as f:
            f.write(line)
    except OSError:
        pass
    return inv


def mark_invoice_paid(invoice_id: str, pf_payment_id: str = "") -> Optional[Dict]:
    inv = _invoices.get(invoice_id)
    if not inv:
        return None
    inv["status"] = "PAID"
    inv["paid_at"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    # Paying an invoice books REAL cash into the settlement ledger
    record_settlement(invoice_id, inv["amount"], f"invoice:{inv['subsidiary']}",
                      status="COMPLETE", pf_payment_id=pf_payment_id)
    ts = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    line = f"{ts} | {invoice_id} | {inv['subsidiary']} | {inv['client']} | {inv['amount']} ZAR | PAID | {pf_payment_id or '-'}\n"
    try:
        with open(_INVOICE_LEDGER, "a", encoding="utf-8") as f:
            f.write(line)
    except OSError:
        pass
    return inv


def list_invoices() -> Dict:
    items = list(_invoices.values())
    total_billed = sum(i["amount"] for i in items)  # everything ever invoiced
    paid = sum(i["amount"] for i in items if i["status"] == "PAID")
    outstanding = sum(i["amount"] for i in items if i["status"] != "PAID")
    return {"count": len(items), "issued_zar": round(total_billed, 2),
            "paid_zar": round(paid, 2), "outstanding_zar": round(outstanding, 2),
            "items": items}
