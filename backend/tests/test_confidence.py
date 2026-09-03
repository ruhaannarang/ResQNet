from app.models.schemas import CandidateRoute, RouteSegment, RoutePoint, DataQuality, DataSource
from app.services.confidence_service import ConfidenceService

def make_route(provider="osrm", is_simulated=False, dq=None, feasibility="compatible"):
    seg = RouteSegment(
        start=RoutePoint(latitude=12.97, longitude=77.59),
        end=RoutePoint(latitude=12.98, longitude=77.60),
        distance_km=1, duration_seconds=300,
        traffic_level=0.3, road_quality=0.9, is_highway=False,
        road_width_meters=6, bridge_clearance_meters=5
    )
    return CandidateRoute(route_id="r", segments=[seg], total_distance_km=1, total_duration_seconds=300, provider=provider, is_simulated=is_simulated, data_quality=dq, feasibility=feasibility)

def test_osrm_confidence_higher_than_simulated():
    dq_real = DataQuality(provider="osrm", road_geometry=DataSource.PROVIDER, traffic=DataSource.ESTIMATED, weather=DataSource.PROVIDER, road_attributes=DataSource.ESTIMATED, is_simulated=False, traffic_confidence=0.55, weather_confidence=0.85, geometry_confidence=0.92, road_attr_confidence=0.5)
    dq_sim = DataQuality(provider="mock", road_geometry=DataSource.SIMULATED, traffic=DataSource.SIMULATED, weather=DataSource.UNAVAILABLE, road_attributes=DataSource.ESTIMATED, is_simulated=True, traffic_confidence=0.3, weather_confidence=0, geometry_confidence=0.3, road_attr_confidence=0.35)
    r_real = make_route(provider="osrm", is_simulated=False, dq=dq_real)
    r_sim = make_route(provider="mock", is_simulated=True, dq=dq_sim)
    c_real = ConfidenceService.compute_route_confidence(r_real)
    c_sim = ConfidenceService.compute_route_confidence(r_sim)
    assert c_real > c_sim
    assert c_sim <= 0.55

def test_google_higher_than_osrm():
    dq_google = DataQuality(provider="google", road_geometry=DataSource.PROVIDER, traffic=DataSource.PROVIDER, weather=DataSource.PROVIDER, road_attributes=DataSource.ESTIMATED, is_simulated=False, traffic_confidence=0.90, weather_confidence=0.85, geometry_confidence=0.95, road_attr_confidence=0.55)
    dq_osrm = DataQuality(provider="osrm", road_geometry=DataSource.PROVIDER, traffic=DataSource.ESTIMATED, weather=DataSource.PROVIDER, road_attributes=DataSource.ESTIMATED, is_simulated=False, traffic_confidence=0.55, weather_confidence=0.85, geometry_confidence=0.92, road_attr_confidence=0.5)
    r_g = make_route(provider="google", dq=dq_google)
    r_o = make_route(provider="osrm", dq=dq_osrm)
    assert ConfidenceService.compute_route_confidence(r_g) > ConfidenceService.compute_route_confidence(r_o)

def test_risky_lowers_confidence():
    dq = DataQuality(provider="osrm", road_geometry=DataSource.PROVIDER, traffic=DataSource.ESTIMATED, weather=DataSource.PROVIDER, road_attributes=DataSource.ESTIMATED, is_simulated=False, traffic_confidence=0.55, weather_confidence=0.85, geometry_confidence=0.92, road_attr_confidence=0.5)
    r_comp = make_route(provider="osrm", dq=dq, feasibility="compatible")
    r_risky = make_route(provider="osrm", dq=dq, feasibility="risky")
    assert ConfidenceService.compute_route_confidence(r_comp) > ConfidenceService.compute_route_confidence(r_risky)

def test_unavailable_weather_lowers_confidence():
    dq_est = DataQuality(provider="osrm", road_geometry=DataSource.PROVIDER, traffic=DataSource.ESTIMATED, weather=DataSource.ESTIMATED, road_attributes=DataSource.ESTIMATED, is_simulated=False, traffic_confidence=0.55, weather_confidence=0.5, geometry_confidence=0.92, road_attr_confidence=0.5)
    dq_unavail = DataQuality(provider="osrm", road_geometry=DataSource.PROVIDER, traffic=DataSource.ESTIMATED, weather=DataSource.UNAVAILABLE, road_attributes=DataSource.ESTIMATED, is_simulated=False, traffic_confidence=0.55, weather_confidence=0, geometry_confidence=0.92, road_attr_confidence=0.5)
    r_est = make_route(provider="osrm", dq=dq_est)
    r_un = make_route(provider="osrm", dq=dq_unavail)
    assert ConfidenceService.compute_route_confidence(r_est) > ConfidenceService.compute_route_confidence(r_un)

def test_build_data_quality_provider():
    dq = ConfidenceService.build_data_quality(provider="google", is_simulated=False, has_live_traffic=True, weather_source=DataSource.PROVIDER, weather_confidence=0.85)
    assert dq.traffic == DataSource.PROVIDER
    assert dq.is_simulated is False
    dq2 = ConfidenceService.build_data_quality(provider="mock", is_simulated=True, has_live_traffic=False, weather_source=DataSource.UNAVAILABLE)
    assert dq2.is_simulated is True
    assert dq2.traffic == DataSource.SIMULATED
