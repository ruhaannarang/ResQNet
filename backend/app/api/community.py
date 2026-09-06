"""Community Updates API — crowdsourced local road reports.

Lets local people report construction, closures, hazards, etc.
Stored in-memory (stateless deployment) with seed data so the
dashboard feed is useful on first load.
"""
from datetime import datetime, timezone
from typing import List, Optional
from uuid import uuid4

from fastapi import APIRouter
from pydantic import BaseModel, Field

router = APIRouter(prefix="/api/v1/community", tags=["community"])


class CommunityUpdateCreate(BaseModel):
    road_name: str = Field(..., min_length=2, max_length=200)
    category: str = Field(default="construction", max_length=50)
    title: str = Field(..., min_length=3, max_length=200)
    description: Optional[str] = Field(default="", max_length=1000)
    severity: str = Field(default="medium", max_length=20)
    area: Optional[str] = Field(default="", max_length=200)
    reporter_name: Optional[str] = Field(default="Anonymous", max_length=100)


class CommunityUpdate(CommunityUpdateCreate):
    id: str
    upvotes: int = 0
    created_at: str
    status: str = "active"


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _seed_updates() -> List[CommunityUpdate]:
    return [
        CommunityUpdate(
            id="seed-1",
            road_name="Outer Ring Road, Marathahalli",
            category="construction",
            title="Metro pillar work — one lane closed",
            description="Namma Metro construction near Marathahalli bridge. One lane barricaded both sides, expect 10-15 min delay. Ambulances use service lane.",
            severity="high",
            area="Marathahalli, Bengaluru",
            reporter_name="Ravi K.",
            upvotes=24,
            created_at=_now_iso(),
        ),
        CommunityUpdate(
            id="seed-2",
            road_name="Whitefield Main Road",
            category="pothole",
            title="Large potholes after rain near ITPL gate",
            description="Deep potholes on left lane towards Hope Farm. Two-wheelers please slow down. Reported to BBMP.",
            severity="medium",
            area="Whitefield, Bengaluru",
            reporter_name="Priya S.",
            upvotes=17,
            created_at=_now_iso(),
        ),
        CommunityUpdate(
            id="seed-3",
            road_name="Electronic City Flyover",
            category="roadblock",
            title="Police barricade for VIP movement till 6 PM",
            description="One lane blocked on flyover entry. Emergency vehicles waved through on request.",
            severity="medium",
            area="Electronic City, Bengaluru",
            reporter_name="Imran M.",
            upvotes=11,
            created_at=_now_iso(),
        ),
        CommunityUpdate(
            id="seed-4",
            road_name="Koramangala 80ft Road",
            category="flooding",
            title="Waterlogging near Forum junction",
            description="Knee-deep water after heavy rain. Avoid low-clearance vehicles, use 100ft road instead.",
            severity="high",
            area="Koramangala, Bengaluru",
            reporter_name="Divya N.",
            upvotes=9,
            created_at=_now_iso(),
        ),
    ]


# In-memory store (resets on restart — fine for stateless routing service)
_updates: List[CommunityUpdate] = _seed_updates()


@router.get("/updates", response_model=List[CommunityUpdate])
async def list_updates(category: Optional[str] = None, limit: int = 50):
    """Newest first, optional category filter."""
    items = list(_updates)
    if category and category != "all":
        items = [u for u in items if u.category.lower() == category.lower()]
    return items[:limit]


@router.post("/updates", response_model=CommunityUpdate, status_code=201)
async def create_update(payload: CommunityUpdateCreate):
    update = CommunityUpdate(
        **payload.model_dump(),
        id=f"cu-{uuid4().hex[:8]}",
        upvotes=0,
        created_at=_now_iso(),
        status="active",
    )
    _updates.insert(0, update)
    return update


@router.post("/updates/{update_id}/upvote", response_model=CommunityUpdate)
async def upvote_update(update_id: str):
    for u in _updates:
        if u.id == update_id:
            u.upvotes += 1
            return u
    # Unknown id — return 404 via exception to keep behavior explicit
    from fastapi import HTTPException

    raise HTTPException(status_code=404, detail=f"Community update {update_id} not found")
