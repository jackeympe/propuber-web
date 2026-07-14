"""Xero accounting sync for PropUber cash rails.

Pushes CONFIRMED settlements (real cash) to Xero as invoices marked PAID, so the
accounting books match the settlement ledger. Uses the Xero "Custom Connection"
OAuth2 client-credentials flow (machine-to-machine, no user redirect).

Setup (Xero developer portal → my.xero.com → Custom Connection):
  1. Create a Custom Connection app scoped to the target org.
  2. Scopes: accounting.transactions accounting.contacts
  3. Put the credentials in backend/.env.xero (gitignored):
       XERO_CLIENT_ID=...
       XERO_CLIENT_SECRET=...
       XERO_TENANT_ID=...        # the org's tenantId (GET /connections)
       XERO_SALES_ACCOUNT=200    # revenue account code (default 200)
       XERO_BANK_ACCOUNT=...     # bank account code for the payment

Nothing here runs unless credentials are present; import is always safe.
"""
from __future__ import annotations
import os
import json
import time
import urllib.request
import urllib.parse
from pathlib import Path
from typing import Dict, Optional

_ENV = Path(__file__).with_name(".env.xero")
_TOKEN_URL = "https://identity.xero.com/connect/token"
_API = "https://api.xero.com/api.xro/2.0"


def _load_env() -> Dict[str, str]:
    cfg = {}
    if _ENV.exists():
        for raw in _ENV.read_text(encoding="utf-8").splitlines():
            raw = raw.strip()
            if raw and not raw.startswith("#") and "=" in raw:
                k, v = raw.split("=", 1)
                cfg[k.strip()] = v.strip()
    # env vars override file
    for k in ("XERO_CLIENT_ID", "XERO_CLIENT_SECRET", "XERO_TENANT_ID",
              "XERO_SALES_ACCOUNT", "XERO_BANK_ACCOUNT"):
        if os.environ.get(k):
            cfg[k] = os.environ[k]
    return cfg


def is_configured() -> bool:
    c = _load_env()
    return bool(c.get("XERO_CLIENT_ID") and c.get("XERO_CLIENT_SECRET") and c.get("XERO_TENANT_ID"))


def _get_token(cfg: Dict[str, str], timeout: int = 15) -> Optional[str]:
    body = urllib.parse.urlencode({
        "grant_type": "client_credentials",
        "scopes": "accounting.transactions accounting.contacts",
    }).encode()
    import base64
    auth = base64.b64encode(f"{cfg['XERO_CLIENT_ID']}:{cfg['XERO_CLIENT_SECRET']}".encode()).decode()
    req = urllib.request.Request(_TOKEN_URL, data=body, headers={
        "Authorization": f"Basic {auth}",
        "Content-Type": "application/x-www-form-urlencoded",
    })
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return json.load(r).get("access_token")
    except Exception:
        return None


def _api(method: str, path: str, token: str, tenant: str,
         payload: Optional[dict] = None, timeout: int = 20) -> Optional[dict]:
    data = json.dumps(payload).encode() if payload is not None else None
    req = urllib.request.Request(_API + path, data=data, method=method, headers={
        "Authorization": f"Bearer {token}",
        "Xero-Tenant-Id": tenant,
        "Accept": "application/json",
        "Content-Type": "application/json",
    })
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return json.load(r)
    except Exception as e:
        return {"error": str(e)}


def push_settlement(client: str, description: str, amount: float,
                    reference: str = "", email: str = "") -> Dict:
    """Create a PAID sales invoice in Xero for a confirmed settlement.
    Returns {"synced": bool, ...}. No-op (synced=False) if Xero not configured."""
    cfg = _load_env()
    if not is_configured():
        return {"synced": False, "reason": "xero_not_configured"}
    token = _get_token(cfg)
    if not token:
        return {"synced": False, "reason": "xero_auth_failed"}
    tenant = cfg["XERO_TENANT_ID"]
    sales_acct = cfg.get("XERO_SALES_ACCOUNT", "200")

    contact = {"Name": client or "PropUber Client"}
    if email:
        contact["EmailAddress"] = email

    invoice = {
        "Type": "ACCREC",
        "Contact": contact,
        "LineItems": [{
            "Description": description or "PropUber service",
            "Quantity": 1.0,
            "UnitAmount": round(float(amount), 2),
            "AccountCode": sales_acct,
        }],
        "Reference": reference,
        "Status": "AUTHORISED",
        "Date": time.strftime("%Y-%m-%d", time.gmtime()),
        "DueDate": time.strftime("%Y-%m-%d", time.gmtime()),
        "CurrencyCode": "ZAR",
    }
    res = _api("POST", "/Invoices", token, tenant, {"Invoices": [invoice]})
    if not res or res.get("error") or not res.get("Invoices"):
        return {"synced": False, "reason": "invoice_create_failed", "detail": res}
    inv = res["Invoices"][0]
    inv_id = inv.get("InvoiceID")

    # Mark it paid if a bank account is configured
    bank = cfg.get("XERO_BANK_ACCOUNT")
    paid = False
    if bank and inv_id:
        pay = {"Payments": [{
            "Invoice": {"InvoiceID": inv_id},
            "Account": {"Code": bank},
            "Date": time.strftime("%Y-%m-%d", time.gmtime()),
            "Amount": round(float(amount), 2),
            "Reference": reference,
        }]}
        pres = _api("PUT", "/Payments", token, tenant, pay)
        paid = bool(pres and not pres.get("error") and pres.get("Payments"))

    return {"synced": True, "invoice_id": inv_id,
            "invoice_number": inv.get("InvoiceNumber"), "paid": paid}
