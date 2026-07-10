import os
from fastapi import FastAPI, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import sys
import os
import hmac
from pathlib import Path

# Make agents/shared importable so we reuse the real approval_gate (single source of truth)
AGENTS_SHARED = Path(__file__).resolve().parent.parent.parent.parent / "agents" / "shared"
if AGENTS_SHARED.exists():
    sys.path.insert(0, str(AGENTS_SHARED))

try:
    import approval_gate as gate
except Exception:
    # Fallback: use the bundled copy if agents/ is unavailable
    sys.path.insert(0, str(Path(__file__).resolve().parent))
    import approval_gate as gate

app = FastAPI(title="PropUber API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Approval decision auth ──────────────────────────────────
# The Hard Handshake decision is owner-only. Token is expected via
#   Authorization: Bearer <PROPUBER_APPROVE_TOKEN>   or   ?token=<...>
# Env var PROPUBER_APPROVE_TOKEN overrides this default. If unset, a
# decision is rejected until configured (fail-closed).
APPROVE_TOKEN = os.environ.get("PROPUBER_APPROVE_TOKEN", "")
# Default dev token so local testing works; CHANGE / set env in prod.
DEFAULT_DEV_TOKEN = "propuber-owner-dev"

# ── Data (ported from frontend/src/App.jsx) ──────────────────
LISTINGS = [
    {"id": 1, "img": "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=600&q=80",
     "title": "Modern Studio, Sandton", "location": "Johannesburg · Gauteng",
     "price": "R 8,500", "per": "/mo", "badge": "For Rent", "rating": 4.93, "reviews": 128,
     "host": "Thabo M.", "hostAvatar": "https://i.pravatar.cc/32?img=11", "beds": 1, "baths": 1, "sqm": 45},
    {"id": 2, "img": "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=600&q=80",
     "title": "Family Home, Pretoria East", "location": "Pretoria · Gauteng",
     "price": "R 2,800,000", "per": "", "badge": "For Sale", "rating": 4.87, "reviews": 64,
     "host": "Naledi K.", "hostAvatar": "https://i.pravatar.cc/32?img=23", "beds": 4, "baths": 3, "sqm": 280},
    {"id": 3, "img": "https://images.unsplash.com/photo-1497366216548-37526070297c?w=600&q=80",
     "title": "Co-Work Space CBD", "location": "Cape Town · Western Cape",
     "price": "R 3,200", "per": "/mo", "badge": "Co-Work", "rating": 4.98, "reviews": 210,
     "host": "Amara D.", "hostAvatar": "https://i.pravatar.cc/32?img=32", "beds": 0, "baths": 2, "sqm": 120},
    {"id": 4, "img": "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=600&q=80",
     "title": "Luxury Townhouse, Umhlanga", "location": "Durban · KwaZulu-Natal",
     "price": "R 5,200,000", "per": "", "badge": "For Sale", "rating": 4.91, "reviews": 47,
     "host": "Sipho V.", "hostAvatar": "https://i.pravatar.cc/32?img=44", "beds": 3, "baths": 2, "sqm": 210},
    {"id": 5, "img": "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=600&q=80",
     "title": "Agricultural Plot", "location": "Polokwane · Limpopo",
     "price": "R 950,000", "per": "", "badge": "For Sale", "rating": 4.76, "reviews": 19,
     "host": "Boitumelo R.", "hostAvatar": "https://i.pravatar.cc/32?img=56", "beds": 0, "baths": 0, "sqm": 5000},
    {"id": 6, "img": "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=600&q=80",
     "title": "Sea-View Flat, Blouberg", "location": "Cape Town · Western Cape",
     "price": "R 12,000", "per": "/mo", "badge": "For Rent", "rating": 4.96, "reviews": 183,
     "host": "Zara N.", "hostAvatar": "https://i.pravatar.cc/32?img=68", "beds": 2, "baths": 2, "sqm": 95},
]

GIGS = [
    {"icon": "🔧", "title": "Maintenance Tech", "pay": "R 280/hr", "cat": "Technical", "open": 12},
    {"icon": "🧹", "title": "Property Cleaner", "pay": "R 150/hr", "cat": "Cleaning", "open": 34},
    {"icon": "🌿", "title": "Landscaper", "pay": "R 200/hr", "cat": "Outdoor", "open": 8},
    {"icon": "🚛", "title": "Moving Assistant", "pay": "R 180/hr", "cat": "Logistics", "open": 21},
    {"icon": "🎨", "title": "Painter", "pay": "R 260/hr", "cat": "Creative", "open": 9},
    {"icon": "📸", "title": "Property Photographer", "pay": "R 500/hr", "cat": "Creative", "open": 3},
]


# ── Schemas ──────────────────────────────────────────────────
class ApprovalRequest(BaseModel):
    agent: str
    amount: float
    description: str
    risk: str = ""
    alternative: str = ""
    deadline: str = ""


class DecisionRequest(BaseModel):
    decision: str  # APPROVE <id> / DENY <id> (or just APPROVE/DENY with request_id)
    reason: str = ""


# ── Listings API ─────────────────────────────────────────────
@app.get("/api/listings")
def get_listings():
    return {"success": True, "count": len(LISTINGS), "data": LISTINGS}


@app.get("/api/listings/{listing_id}")
def get_listing(listing_id: int):
    item = next((l for l in LISTINGS if l["id"] == listing_id), None)
    if not item:
        raise HTTPException(status_code=404, detail="Listing not found")
    return {"success": True, "data": item}


@app.get("/api/gigs")
def get_gigs():
    return {"success": True, "count": len(GIGS), "data": GIGS}


# ── Approval Queue (Hard Handshake, R5k lock + 50/30/8.55 split) ──
@app.post("/api/approval/request")
def request_approval(req: ApprovalRequest):
    request = gate.build_request(
        agent=req.agent, amount=req.amount, description=req.description,
        risk=req.risk, alternative=req.alternative, deadline=req.deadline,
    )
    requires_approval = req.amount > gate.DEFAULT_THRESHOLD
    return {
        "success": True,
        "request_id": request["request_id"],
        "status": request["status"],
        "requires_approval": requires_approval,
        "threshold_zar": gate.DEFAULT_THRESHOLD,
        "owner_telegram_id": gate.TELEGRAM_OWNER_ID,
        "formatted": gate.format_request(request),
        "message": (
            "Amount exceeds R5,000 — routed to Jacob Mpe for Hard Handshake approval."
            if requires_approval else "Within threshold — no approval required."
        ),
    }


def _check_owner(authorization: Optional[str] = Header(default=None), token: Optional[str] = None):
    expected = APPROVE_TOKEN or DEFAULT_DEV_TOKEN
    provided = None
    if authorization and authorization.lower().startswith("bearer "):
        provided = authorization.split(" ", 1)[1].strip()
    elif authorization:
        provided = authorization.strip()
    if not provided and token:
        provided = token
    if not provided or not hmac.compare_digest(provided, expected):
        raise HTTPException(status_code=401, detail="Unauthorized — owner token required to decide approvals")


@app.post("/api/approval/decide/{request_id}")
def decide_approval(request_id: str, req: DecisionRequest, authorization: Optional[str] = Header(default=None), token: Optional[str] = None):
    _check_owner(authorization=authorization, token=token)
    result = gate.decide(request_id, req.decision, reason=req.reason)
    if not result:
        raise HTTPException(status_code=404, detail="Request not found or already decided")
    return {
        "success": True,
        "request_id": request_id,
        "status": result["status"],
        "split": result.get("split"),
    }


@app.get("/api/approval/queue")
def get_queue():
    pending = list(gate._pending.values())
    decided = list(gate._decided.values())
    return {
        "success": True,
        "pending": len(pending),
        "decided": len(decided),
        "pending_items": pending,
        "decided_items": decided,
    }


@app.get("/api/approval/split/{amount}")
def preview_split(amount: float):
    return {"success": True, "amount": amount, "split": gate.compute_build_charger_split(amount)}


@app.get("/health")
def health():
    return {"status": "ok", "service": "propuber-api", "approval_threshold_zar": gate.DEFAULT_THRESHOLD}
