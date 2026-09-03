import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def base_request(origin=(12.9716,77.5946), dest=(12.9866,77.6066), category="medical", vehicle="ambulance_als", medical_subtype="cardiac"):
    return {
        "origin": {"latitude": origin[0], "longitude": origin[1]},
        "destination": {"latitude": dest[0], "longitude": dest[1]},
        "incident": {
            "category": category,
            "priority": "critical",
            "medical_subtype": medical_subtype if category=="medical" else None,
            "num_patients": 1,
            "requires_special_equipment": True
        },
        "vehicle": {
            "vehicle_class": vehicle,
            "max_width_meters": 3.0 if vehicle=="fire_truck" else 2.5,
            "max_height_meters": 3.5 if vehicle=="fire_truck" else 2.8,
            "max_weight_tons": 15 if vehicle=="fire_truck" else 5,
            "can_handle_steep_grades": True,
            "min_road_width_meters": 4.0 if vehicle=="fire_truck" else 3.0,
            "requires_paved_road": True
        }
    }

def test_health():
    r = client.get("/api/v1/health")
    assert r.status_code == 200
    assert r.json()["status"] == "healthy"

def test_providers_status():
    r = client.get("/api/v1/providers/status")
    assert r.status_code == 200
    assert "osrm" in r.json()
    assert "_config" in r.json()

def test_optimize_routes_success():
    r = client.post("/api/v1/routes/optimize", json=base_request())
    assert r.status_code == 200, r.text
    data = r.json()
    assert "best_route" in data
    assert "scores" in data
    assert "explanation" in data
    assert data["provider"] in ("osrm","google","mock")
    assert "confidence" in data
    assert "data_quality" in data
    # Check sourced metrics
    seg = data["best_route"]["segments"][0]
    assert "traffic" in seg
    assert "source" in seg["traffic"]

def test_legacy_emergency_route_still_works():
    r = client.post("/api/v1/emergency/route", json=base_request())
    assert r.status_code == 200

def test_invalid_coords_zero():
    req = base_request(origin=(0,0), dest=(12.97,77.59))
    r = client.post("/api/v1/routes/optimize", json=req)
    assert r.status_code in (404,422,502,503)

def test_same_origin_destination():
    req = base_request(origin=(12.97,77.59), dest=(12.97,77.59))
    r = client.post("/api/v1/routes/optimize", json=req)
    assert r.status_code in (404,422,502)

def test_provider_unavailable_simulated_flag():
    # Should work with ALLOW_SIMULATED false but OSRM is available, so should still succeed
    r = client.post("/api/v1/routes/optimize", json=base_request())
    assert r.status_code == 200
    assert r.headers.get("X-Request-ID") is not None

def test_reroute_evaluation():
    r = client.post("/api/v1/routes/evaluate-reroute", json={
        "gps_update": {
            "vehicle_id": "V1",
            "position": {"latitude": 12.97, "longitude": 77.59},
            "speed_kmh": 30,
            "heading": 0,
            "timestamp": "2026-09-03T00:00:00Z"
        },
        "current_route": None
    })
    # Legacy path: should handle missing route gracefully
    # Our new endpoint expects gps_update wrapper, but should not crash
    assert r.status_code in (200,422)

def test_scenarios_critical_cardiac():
    r = client.post("/api/v1/routes/optimize", json=base_request(category="medical", medical_subtype="cardiac"))
    assert r.status_code == 200
    assert r.json()["explanation"]["confidence_score"] > 0

def test_scenarios_spinal():
    r = client.post("/api/v1/routes/optimize", json=base_request(category="medical", medical_subtype="spinal"))
    assert r.status_code == 200

def test_scenarios_fire_narrow():
    r = client.post("/api/v1/routes/optimize", json=base_request(category="fire", vehicle="fire_truck"))
    assert r.status_code == 200
    # Fire truck may be risky but should return something
    data = r.json()
    assert data["best_route"]["feasibility"] in ("compatible","risky","impossible")

def test_scenarios_police():
    r = client.post("/api/v1/routes/optimize", json=base_request(category="police", vehicle="police_car"))
    assert r.status_code == 200

def test_scenarios_disaster():
    r = client.post("/api/v1/routes/optimize", json=base_request(category="disaster", vehicle="rescue_van"))
    assert r.status_code == 200

def test_request_id_header():
    r = client.post("/api/v1/routes/optimize", json=base_request())
    assert "X-Request-ID" in r.headers
