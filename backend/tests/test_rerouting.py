from app.models.schemas import CandidateRoute, RouteSegment, RoutePoint, GPSPosition, GPSUpdate
from app.services.rerouting_service import ReroutingService

def make_route(traffic=0.3, quality=0.9, road_width=5, clearance=5):
    segs = []
    for i in range(3):
        segs.append(RouteSegment(
            start=RoutePoint(latitude=12.97+i*0.01, longitude=77.59+i*0.01),
            end=RoutePoint(latitude=12.98+i*0.01, longitude=77.60+i*0.01),
            distance_km=1, duration_seconds=300,
            traffic_level=traffic, road_quality=quality, is_highway=False,
            road_width_meters=road_width, bridge_clearance_meters=clearance
        ))
    return CandidateRoute(route_id="r", segments=segs, total_distance_km=3, total_duration_seconds=900, provider="osrm")

def make_update(lat=12.97, lng=77.59):
    return GPSUpdate(vehicle_id="V1", position=GPSPosition(latitude=lat, longitude=lng), speed_kmh=30, heading=0, timestamp="2026-09-03T00:00:00Z")

def test_no_reroute_when_healthy():
    svc = ReroutingService(min_interval_seconds=0)
    route = make_route(traffic=0.2, quality=0.9)
    upd = make_update()
    res = svc.evaluate(upd, route, current_weather_risk=1)
    assert res["should_reroute"] is False
    assert "still optimal" in res["reason"].lower() or len(res["triggers"]) == 0

def test_reroute_on_high_congestion():
    svc = ReroutingService(min_interval_seconds=0, degradation_threshold=0.12)
    route = make_route(traffic=0.9, quality=0.9)
    upd = make_update()
    res = svc.evaluate(upd, route, current_weather_risk=0)
    assert res["should_reroute"] is True
    assert any("congestion" in t.lower() for t in res["triggers"])

def test_reroute_on_blocked_road():
    svc = ReroutingService(min_interval_seconds=0)
    route = make_route(traffic=0.2, quality=0.1)
    upd = make_update()
    res = svc.evaluate(upd, route)
    assert res["should_reroute"] is True

def test_hysteresis_blocks_frequent_reroute():
    svc = ReroutingService(min_interval_seconds=60)
    route = make_route(traffic=0.9)
    upd = make_update()
    first = svc.evaluate(upd, route)
    # Even though degraded, second call within 60s should be blocked
    second = svc.evaluate(upd, route)
    assert second["hysteresis_applied"] is True
    assert second["should_reroute"] is False

def test_improvement_threshold_prevents_small_gain():
    svc = ReroutingService(min_interval_seconds=0, improvement_threshold=0.15)
    route = make_route(traffic=0.7, quality=0.8)
    # Create a new route only slightly better (5% improvement)
    new_route = make_route(traffic=0.7, quality=0.8)
    new_route.total_duration_seconds = int(route.total_duration_seconds * 0.95)  # 5% faster
    upd = make_update()
    # Force degradation to be high
    route.segments[0].traffic_level = 0.8
    res = svc.evaluate(upd, route, current_weather_risk=0, new_best_route=new_route)
    # Degraded but improvement < threshold => hysteresis
    assert res["hysteresis_applied"] is True
    assert res["should_reroute"] is False

def test_impossible_feasibility_triggers_immediate_reroute():
    svc = ReroutingService(min_interval_seconds=0)
    route = make_route(road_width=2.0, clearance=2.0)  # violates typical vehicle
    upd = make_update()
    res = svc.evaluate(upd, route)
    assert res["should_reroute"] is True
    assert "CRITICAL" in res["reason"]
