import pytest
from app.models.schemas import CandidateRoute, RouteSegment, RoutePoint, IncidentProfile, VehicleProfile, DataQuality, DataSource, MetricValue, WeatherMetric
from app.models.enums import EmergencyCategory, EmergencyPriority, MedicalSubType, VehicleClass
from app.services.route_optimizer import RouteOptimizer

def make_route(route_id, dist_km, duration_s, traffic, quality, num_turns, major_pct, narrow_pct, width, clearance):
    segs = []
    for i in range(4):
        segs.append(RouteSegment(
            start=RoutePoint(latitude=12.97+i*0.005, longitude=77.59+i*0.005),
            end=RoutePoint(latitude=12.97+(i+1)*0.005, longitude=77.59+(i+1)*0.005),
            distance_km=dist_km/4,
            duration_seconds=duration_s/4,
            traffic_level=traffic,
            road_quality=quality,
            weather_condition="clear",
            is_highway=major_pct>0.5,
            road_width_meters=width,
            bridge_clearance_meters=clearance,
            traffic=MetricValue(value=traffic, source=DataSource.ESTIMATED, confidence=0.5),
            road_quality_metric=MetricValue(value=quality, source=DataSource.ESTIMATED, confidence=0.5),
            road_width=MetricValue(value=width, source=DataSource.ESTIMATED, confidence=0.5),
            bridge_clearance=MetricValue(value=clearance, source=DataSource.ESTIMATED, confidence=0.5),
            weather=WeatherMetric(value="clear", source=DataSource.ESTIMATED, confidence=0.5),
        ))
    return CandidateRoute(
        route_id=route_id,
        segments=segs,
        total_distance_km=dist_km,
        total_duration_seconds=duration_s,
        provider="test",
        is_simulated=False,
        data_quality=DataQuality(provider="test", traffic=DataSource.ESTIMATED, weather=DataSource.ESTIMATED, road_geometry=DataSource.PROVIDER, road_attributes=DataSource.ESTIMATED, is_simulated=False, traffic_confidence=0.5, weather_confidence=0.5, geometry_confidence=0.9, road_attr_confidence=0.5),
        num_turns=num_turns,
        major_road_pct=major_pct,
        narrow_road_pct=narrow_pct,
        avg_bearing_change_deg=15 if num_turns<3 else 45,
        feasibility="compatible",
    )

# Spec routes
routeA = make_route("RouteA", dist_km=5.0, duration_s=840, traffic=0.82, quality=0.35, num_turns=10, major_pct=0.2, narrow_pct=0.4, width=4.5, clearance=4.0) # fastest 14m heavy poor many turns
routeB = make_route("RouteB", dist_km=6.2, duration_s=960, traffic=0.15, quality=0.92, num_turns=2, major_pct=0.6, narrow_pct=0.1, width=6.0, clearance=5.0) # medium 16m low excellent few
routeC = make_route("RouteC", dist_km=7.5, duration_s=1200, traffic=0.45, quality=0.65, num_turns=3, major_pct=0.9, narrow_pct=0.0, width=7.5, clearance=5.5) # longest 20m moderate wide major

def optimize(incident, vehicle):
    opt = RouteOptimizer()
    routes = [make_route(r.route_id, r.total_distance_km, r.total_duration_seconds, r.segments[0].traffic_level, r.segments[0].road_quality, r.num_turns, r.major_road_pct, r.narrow_road_pct, r.segments[0].road_width_meters, r.segments[0].bridge_clearance_meters) for r in [routeA, routeB, routeC]]
    # Re-evaluate feasibility for this vehicle
    from app.services.vehicle_constraints import VehicleConstraints
    for r in routes:
        feas, viol, warns = VehicleConstraints.check_route(r, vehicle, incident)
        r.feasibility = feas
        r.feasibility_reasons = viol
        r.warnings = warns
    compatible = [r for r in routes if r.feasibility != "impossible"]
    if not compatible:
        compatible = routes[:1]
    scored = []
    for route in compatible:
        s = opt.compute_soft_scores(route, incident, vehicle)
        route.total_score = s.total_score
        scored.append((route, s))
    best, _ = opt.select_best(scored, incident, vehicle)
    return best.route_id, scored

def test_cardiac_prefers_fastest():
    incident = IncidentProfile(category=EmergencyCategory.MEDICAL, priority=EmergencyPriority.CRITICAL, medical_subtype=MedicalSubType.CARDIAC)
    vehicle = VehicleProfile(vehicle_class=VehicleClass.AMBULANCE_ALS)
    best, scored = optimize(incident, vehicle)
    assert best == "RouteA", f"Cardiac should pick fastest RouteA, got {best} with scores {[ (r.route_id, s.time_score, s.traffic_score) for r,s in scored]}"

def test_spinal_prefers_smooth():
    incident = IncidentProfile(category=EmergencyCategory.MEDICAL, priority=EmergencyPriority.HIGH, medical_subtype=MedicalSubType.SPINAL)
    vehicle = VehicleProfile(vehicle_class=VehicleClass.AMBULANCE_ALS)
    best, _ = optimize(incident, vehicle)
    assert best == "RouteB", f"Spinal should pick excellent quality RouteB, got {best}"

def test_fire_prefers_wide():
    incident = IncidentProfile(category=EmergencyCategory.FIRE, priority=EmergencyPriority.HIGH)
    vehicle = VehicleProfile(vehicle_class=VehicleClass.FIRE_TRUCK, max_width_meters=3.0, max_height_meters=3.5, max_weight_tons=15, min_road_width_meters=4.0)
    best, _ = optimize(incident, vehicle)
    assert best == "RouteC", f"Fire should pick wide major RouteC, got {best}"

def test_police_prefers_fast():
    incident = IncidentProfile(category=EmergencyCategory.POLICE, priority=EmergencyPriority.HIGH)
    vehicle = VehicleProfile(vehicle_class=VehicleClass.POLICE_CAR)
    best, _ = optimize(incident, vehicle)
    # Police very high ETA, should pick fastest A
    assert best == "RouteA"

def test_disaster_prefers_reliable():
    incident = IncidentProfile(category=EmergencyCategory.DISASTER, priority=EmergencyPriority.HIGH)
    vehicle = VehicleProfile(vehicle_class=VehicleClass.RESCUE_VAN)
    best, _ = optimize(incident, vehicle)
    assert best == "RouteB"

def test_maternity_prefers_comfort():
    incident = IncidentProfile(category=EmergencyCategory.MEDICAL, priority=EmergencyPriority.HIGH, medical_subtype=MedicalSubType.MATERNITY)
    vehicle = VehicleProfile(vehicle_class=VehicleClass.AMBULANCE_ALS)
    best, _ = optimize(incident, vehicle)
    assert best == "RouteB"

def test_weights_reach_scoring():
    # Verify emergency-specific weights are actually used
    from app.services.optimization_strategies import get_strategy
    cardiac = IncidentProfile(category=EmergencyCategory.MEDICAL, priority=EmergencyPriority.CRITICAL, medical_subtype=MedicalSubType.CARDIAC)
    spinal = IncidentProfile(category=EmergencyCategory.MEDICAL, priority=EmergencyPriority.HIGH, medical_subtype=MedicalSubType.SPINAL)
    veh = VehicleProfile(vehicle_class=VehicleClass.AMBULANCE_ALS)
    w_card = get_strategy(cardiac).get_weights(cardiac, veh)
    w_spin = get_strategy(spinal).get_weights(spinal, veh)
    assert w_card["time"] > w_spin["time"] + 0.3, "Cardiac time weight should be >> spinal"
    assert w_spin["incident_comfort"] > w_card["incident_comfort"] + 0.2
    assert w_spin["road_quality"] > w_card["road_quality"] + 0.15

def test_turns_affect_spinal():
    # Ensure turn count influences spinal scoring
    opt = RouteOptimizer()
    incident = IncidentProfile(category=EmergencyCategory.MEDICAL, priority=EmergencyPriority.HIGH, medical_subtype=MedicalSubType.SPINAL)
    veh = VehicleProfile(vehicle_class=VehicleClass.AMBULANCE_ALS)
    r_many = make_route("Many", 5.0, 900, 0.3, 0.8, num_turns=12, major_pct=0.5, narrow_pct=0.1, width=6.0, clearance=5.0)
    r_few = make_route("Few", 5.0, 900, 0.3, 0.8, num_turns=1, major_pct=0.5, narrow_pct=0.1, width=6.0, clearance=5.0)
    s_many = opt.compute_soft_scores(r_many, incident, veh)
    s_few = opt.compute_soft_scores(r_few, incident, veh)
    assert s_many.incident_comfort_score > s_few.incident_comfort_score + 5, "Spinal comfort should penalize many turns heavily"
