import pytest
from app.models.schemas import CandidateRoute, RouteSegment, RoutePoint, VehicleProfile, IncidentProfile
from app.models.enums import EmergencyCategory, EmergencyPriority, VehicleClass
from app.services.vehicle_constraints import VehicleConstraints

def make_route(road_width=5.0, clearance=5.0, quality=0.9):
    seg = RouteSegment(
        start=RoutePoint(latitude=12.97, longitude=77.59),
        end=RoutePoint(latitude=12.98, longitude=77.60),
        distance_km=1.0, duration_seconds=300,
        traffic_level=0.3, road_quality=quality, is_highway=False,
        road_width_meters=road_width, bridge_clearance_meters=clearance
    )
    return CandidateRoute(route_id="test", segments=[seg], total_distance_km=1, total_duration_seconds=300)

def test_compatible_route():
    route = make_route(road_width=6.0, clearance=5.0, quality=0.9)
    vehicle = VehicleProfile(vehicle_class=VehicleClass.AMBULANCE_ALS, min_road_width_meters=3.0, max_height_meters=2.8)
    incident = IncidentProfile(category=EmergencyCategory.MEDICAL, priority=EmergencyPriority.CRITICAL)
    feas, viol, warns = VehicleConstraints.check_route(route, vehicle, incident)
    assert feas == "compatible"
    assert len(viol) == 0

def test_impossible_width():
    route = make_route(road_width=2.5, clearance=5.0)
    vehicle = VehicleProfile(vehicle_class=VehicleClass.FIRE_TRUCK, min_road_width_meters=4.0, max_height_meters=3.5)
    incident = IncidentProfile(category=EmergencyCategory.FIRE, priority=EmergencyPriority.HIGH)
    feas, viol, warns = VehicleConstraints.check_route(route, vehicle, incident)
    assert feas == "impossible"
    assert any("Road width" in v for v in viol)

def test_impossible_clearance():
    route = make_route(road_width=6.0, clearance=2.5)
    vehicle = VehicleProfile(vehicle_class=VehicleClass.FIRE_TRUCK, min_road_width_meters=4.0, max_height_meters=3.5)
    incident = IncidentProfile(category=EmergencyCategory.FIRE, priority=EmergencyPriority.HIGH)
    feas, viol, warns = VehicleConstraints.check_route(route, vehicle, incident)
    assert feas == "impossible"
    assert any("clearance" in v.lower() for v in viol)

def test_risky_narrow_margin():
    route = make_route(road_width=3.2, clearance=3.0)
    vehicle = VehicleProfile(vehicle_class=VehicleClass.AMBULANCE_ALS, min_road_width_meters=3.0, max_height_meters=2.8)
    incident = IncidentProfile(category=EmergencyCategory.MEDICAL, priority=EmergencyPriority.MEDIUM)
    feas, viol, warns = VehicleConstraints.check_route(route, vehicle, incident)
    assert feas == "risky"
    assert len(warns) > 0

def test_fire_truck_many_narrow_segments():
    segs = []
    for _ in range(4):
        segs.append(RouteSegment(
            start=RoutePoint(latitude=12.97, longitude=77.59),
            end=RoutePoint(latitude=12.98, longitude=77.60),
            distance_km=0.5, duration_seconds=100,
            traffic_level=0.2, road_quality=0.8, is_highway=False,
            road_width_meters=4.0, bridge_clearance_meters=5.0
        ))
    route = CandidateRoute(route_id="fire", segments=segs, total_distance_km=2, total_duration_seconds=400)
    vehicle = VehicleProfile(vehicle_class=VehicleClass.FIRE_TRUCK, min_road_width_meters=4.0, max_height_meters=3.5)
    incident = IncidentProfile(category=EmergencyCategory.FIRE, priority=EmergencyPriority.HIGH)
    feas, viol, warns = VehicleConstraints.check_route(route, vehicle, incident)
    # 4 segments <4.5 ratio 1.0 >0.5 triggers risky warning even if not impossible
    assert feas in ("risky", "compatible")

def test_unpaved_not_suitable():
    route = make_route(road_width=6, clearance=5, quality=0.2)
    vehicle = VehicleProfile(vehicle_class=VehicleClass.AMBULANCE_ALS, requires_paved_road=True, min_road_width_meters=3.0, max_height_meters=2.8)
    incident = IncidentProfile(category=EmergencyCategory.MEDICAL, priority=EmergencyPriority.CRITICAL)
    feas, viol, warns = VehicleConstraints.check_route(route, vehicle, incident)
    assert feas == "impossible"
