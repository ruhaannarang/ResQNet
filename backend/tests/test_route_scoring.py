import pytest
from app.models.schemas import CandidateRoute, RouteSegment, RoutePoint, VehicleProfile, IncidentProfile
from app.models.enums import EmergencyCategory, EmergencyPriority, MedicalSubType, VehicleClass
from app.services.route_optimizer import RouteOptimizer

def make_route(traffic=0.3, quality=0.8, duration=600):
    seg = RouteSegment(
        start=RoutePoint(latitude=12.97, longitude=77.59),
        end=RoutePoint(latitude=12.98, longitude=77.60),
        distance_km=1.0, duration_seconds=duration,
        traffic_level=traffic, road_quality=quality, is_highway=False,
        road_width_meters=6.0, bridge_clearance_meters=5.0
    )
    return CandidateRoute(route_id="r1", segments=[seg, seg], total_distance_km=2.0, total_duration_seconds=duration*2, feasibility="compatible")

def test_compute_soft_scores_basic():
    opt = RouteOptimizer()
    route = make_route(traffic=0.2, quality=0.9, duration=300)
    inc = IncidentProfile(category=EmergencyCategory.MEDICAL, priority=EmergencyPriority.CRITICAL, medical_subtype=MedicalSubType.CARDIAC)
    veh = VehicleProfile(vehicle_class=VehicleClass.AMBULANCE_ALS)
    score = opt.compute_soft_scores(route, inc, veh)
    assert score.time_score > 0
    assert score.traffic_score == pytest.approx(0.2*10)
    assert score.road_quality_score == pytest.approx((1-0.9)*10)

def test_spinal_comfort_penalty_high_on_poor_roads():
    opt = RouteOptimizer()
    poor = make_route(quality=0.4, duration=300)
    good = make_route(quality=0.9, duration=300)
    inc = IncidentProfile(category=EmergencyCategory.MEDICAL, priority=EmergencyPriority.HIGH, medical_subtype=MedicalSubType.SPINAL)
    veh = VehicleProfile(vehicle_class=VehicleClass.AMBULANCE_ALS)
    score_poor = opt.compute_soft_scores(poor, inc, veh)
    score_good = opt.compute_soft_scores(good, inc, veh)
    assert score_poor.incident_comfort_score > score_good.incident_comfort_score

def test_weather_heavy_increases_score():
    opt = RouteOptimizer()
    route = make_route()
    inc = IncidentProfile(category=EmergencyCategory.FIRE, priority=EmergencyPriority.HIGH)
    veh = VehicleProfile(vehicle_class=VehicleClass.FIRE_TRUCK)
    weather_clear = {"condition": "clear", "precipitation_mm": 0, "wind_speed_ms": 2}
    weather_storm = {"condition": "storm", "precipitation_mm": 30, "wind_speed_ms": 25}
    score_clear = opt.compute_soft_scores(route, inc, veh, weather_data=weather_clear)
    score_storm = opt.compute_soft_scores(route, inc, veh, weather_data=weather_storm)
    assert score_storm.weather_score > score_clear.weather_score

def test_select_best_prefers_fast_cardiac():
    opt = RouteOptimizer()
    fast = make_route(duration=200)
    fast.route_id = "fast"
    slow = make_route(duration=600)
    slow.route_id = "slow"
    inc = IncidentProfile(category=EmergencyCategory.MEDICAL, priority=EmergencyPriority.CRITICAL, medical_subtype=MedicalSubType.CARDIAC)
    veh = VehicleProfile(vehicle_class=VehicleClass.AMBULANCE_ALS)
    s_fast = opt.compute_soft_scores(fast, inc, veh)
    s_slow = opt.compute_soft_scores(slow, inc, veh)
    best, _ = opt.select_best([(fast, s_fast), (slow, s_slow)], inc, veh)
    assert best.route_id == "fast"

def test_risky_route_has_higher_reliability_penalty():
    opt = RouteOptimizer()
    risky = make_route(duration=300)
    risky.feasibility = "risky"
    compat = make_route(duration=300)
    compat.feasibility = "compatible"
    inc = IncidentProfile(category=EmergencyCategory.DISASTER, priority=EmergencyPriority.HIGH)
    veh = VehicleProfile(vehicle_class=VehicleClass.RESCUE_VAN)
    s_risky = opt.compute_soft_scores(risky, inc, veh)
    s_compat = opt.compute_soft_scores(compat, inc, veh)
    assert s_risky.reliability_score > s_compat.reliability_score
