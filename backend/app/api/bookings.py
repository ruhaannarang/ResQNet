"""Bookings API — user portal requests served to the driver portal.

In-memory store (same pattern as community updates): resets on restart,
seeded so the driver portal is useful on first load.
"""
from datetime import datetime, timezone
from typing import List, Optional
from uuid import uuid4

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

router = APIRouter(prefix="/api/v1/bookings", tags=["bookings"])

STATUSES = ("pending", "accepted", "enroute", "completed", "cancelled")


class BookingCreate(BaseModel):
    requester_name: str = Field(..., min_length=2, max_length=100)
    phone: str = Field(..., min_length=6, max_length=20)
    category: str = Field(default="medical", max_length=20)
    # medical only: "pickup" (ambulance to patient) | "to_hospital" (take patient to hospital)
    medical_service_type: Optional[str] = Field(default=None, max_length=20)
    pickup_address: str = Field(..., min_length=3, max_length=300)
    destination: Optional[str] = Field(default="", max_length=300)
    priority: str = Field(default="high", max_length=20)
    num_patients: int = Field(default=1, ge=1, le=20)
    description: Optional[str] = Field(default="", max_length=1000)


class Booking(BookingCreate):
    id: str
    status: str = "pending"
    created_at: str
    updated_at: str


class StatusUpdate(BaseModel):
    status: str = Field(..., max_length=20)


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _seed_bookings() -> List[Booking]:
    now = _now_iso()
    return [
        Booking(
            id="seed-b1",
            requester_name="Asha R.",
            phone="+91 98450 12345",
            category="medical",
            medical_service_type="pickup",
            pickup_address="14th Cross, HSR Layout Sector 6, Bengaluru",
            destination="Narayana Health City (preferred)",
            priority="critical",
            num_patients=1,
            description="Elderly patient, chest pain. Need ambulance at home gate.",
            status="pending",
            created_at=now,
            updated_at=now,
        ),
        Booking(
            id="seed-b2",
            requester_name="Kiran M.",
            phone="+91 99010 67890",
            category="medical",
            medical_service_type="to_hospital",
            pickup_address="Sony World Signal, Koramangala, Bengaluru",
            destination="St. John's Medical College Hospital",
            priority="high",
            num_patients=1,
            description="Road accident victim, conscious. Need hospital transfer.",
            status="accepted",
            created_at=now,
            updated_at=now,
        ),
    ]


_bookings: List[Booking] = _seed_bookings()


@router.get("", response_model=List[Booking])
async def list_bookings(status: Optional[str] = None, limit: int = 100):
    """Newest first, optional status filter."""
    items = list(_bookings)
    if status and status != "all":
        items = [b for b in items if b.status == status.lower()]
    return items[:limit]


@router.post("", response_model=Booking, status_code=201)
async def create_booking(payload: BookingCreate):
    now = _now_iso()
    booking = Booking(
        **payload.model_dump(),
        id=f"bk-{uuid4().hex[:8]}",
        status="pending",
        created_at=now,
        updated_at=now,
    )
    _bookings.insert(0, booking)
    return booking


@router.patch("/{booking_id}/status", response_model=Booking)
async def update_booking_status(booking_id: str, payload: StatusUpdate):
    new_status = payload.status.lower()
    if new_status not in STATUSES:
        raise HTTPException(status_code=422, detail=f"Invalid status. Use one of: {', '.join(STATUSES)}")
    for b in _bookings:
        if b.id == booking_id:
            b.status = new_status
            b.updated_at = _now_iso()
            return b
    raise HTTPException(status_code=404, detail=f"Booking {booking_id} not found")
