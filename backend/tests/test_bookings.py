"""Bookings API tests — structured coordinates + trip-phase flow."""
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

# Spec test flow: MSRIT pickup, Manipal Hospital destination
MSRIT = {"lat": 13.0298, "lng": 77.5645}
MANIPAL = {"lat": 12.9591, "lng": 77.6483}


def base_booking(**over):
    payload = {
        "requester_name": "Test User",
        "phone": "+91 90000 00000",
        "category": "medical",
        "medical_service_type": "to_hospital",
        "pickup_address": "MS Ramaiah Institute of Technology, Bengaluru",
        "pickup_latitude": MSRIT["lat"],
        "pickup_longitude": MSRIT["lng"],
        "destination_address": "Manipal Hospital, Bengaluru",
        "destination_latitude": MANIPAL["lat"],
        "destination_longitude": MANIPAL["lng"],
        "priority": "critical",
        "num_patients": 1,
        "description": "spec test flow",
    }
    payload.update(over)
    return payload


def create(payload):
    r = client.post("/api/v1/bookings", json=payload)
    assert r.status_code == 201, r.text
    return r.json()


def set_status(bid, status):
    return client.patch(f"/api/v1/bookings/{bid}/status", json={"status": status})


def test_create_stores_structured_coords():
    b = create(base_booking())
    assert b["pickup_address"] == "MS Ramaiah Institute of Technology, Bengaluru"
    assert b["pickup_latitude"] == pytest.approx(MSRIT["lat"])
    assert b["pickup_longitude"] == pytest.approx(MSRIT["lng"])
    assert b["destination_address"] == "Manipal Hospital, Bengaluru"
    assert b["destination_latitude"] == pytest.approx(MANIPAL["lat"])
    assert b["destination_longitude"] == pytest.approx(MANIPAL["lng"])
    assert b["status"] == "pending"


def test_create_allows_missing_coords():
    # Typed addresses without GPS still book; routing validates later.
    b = create(base_booking(pickup_latitude=None, pickup_longitude=None,
                            destination_latitude=None, destination_longitude=None))
    assert b["pickup_latitude"] is None
    assert b["destination_latitude"] is None


def test_create_rejects_invalid_coords():
    r = client.post("/api/v1/bookings", json=base_booking(pickup_latitude=120.0))
    assert r.status_code == 422
    r = client.post("/api/v1/bookings", json=base_booking(destination_longitude=999.0))
    assert r.status_code == 422


def test_trip_phase_flow():
    b = create(base_booking())
    bid = b["id"]
    for phase in ("accepted", "arrived_at_patient", "transporting", "completed"):
        r = set_status(bid, phase)
        assert r.status_code == 200, r.text
        assert r.json()["status"] == phase
    # Coordinates survive every transition untouched
    final = r.json()
    assert final["pickup_latitude"] == pytest.approx(MSRIT["lat"])
    assert final["destination_latitude"] == pytest.approx(MANIPAL["lat"])


def test_cancel_from_active_phase():
    b = create(base_booking())
    r = set_status(b["id"], "cancelled")
    assert r.status_code == 200
    assert r.json()["status"] == "cancelled"


def test_invalid_status_rejected():
    b = create(base_booking())
    r = set_status(b["id"], "enroute")  # legacy value, no longer valid
    assert r.status_code == 422
    r = set_status(b["id"], "flying")
    assert r.status_code == 422


def test_unknown_booking_404():
    r = set_status("bk-doesnotexist", "accepted")
    assert r.status_code == 404


def test_list_and_status_filter():
    b = create(base_booking())
    r = client.get("/api/v1/bookings", params={"status": "pending"})
    assert r.status_code == 200
    ids = [x["id"] for x in r.json()]
    assert b["id"] in ids
