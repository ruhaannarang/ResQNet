from pydantic import BaseModel, Field
from typing import Optional, List, Literal
from enum import Enum
from .enums import EmergencyCategory, EmergencyPriority, MedicalSubType, VehicleClass


class DataSource(str, Enum):
    PROVIDER = "provider"
    OPENSTREETMAP = "openstreetmap"
    ESTIMATED = "estimated"
    UNAVAILABLE = "unavailable"
    SIMULATED = "simulated"


class MetricValue(BaseModel):
    """Every data point carries its provenance and confidence."""
    value: Optional[float] = None
    source: DataSource = DataSource.ESTIMATED
    confidence: float = Field(default=0.5, ge=0.0, le=1.0)
    note: Optional[str] = None


class WeatherMetric(BaseModel):
    value: str = "clear"
    source: DataSource = DataSource.ESTIMATED
    confidence: float = 0.5
    note: Optional[str] = None


class DataQuality(BaseModel):
    traffic: DataSource = DataSource.ESTIMATED
    weather: DataSource = DataSource.ESTIMATED
    road_geometry: DataSource = DataSource.PROVIDER
    road_attributes: DataSource = DataSource.ESTIMATED
    is_simulated: bool = False
    provider: str = "unknown"
    traffic_confidence: float = 0.5
    weather_confidence: float = 0.5
    geometry_confidence: float = 0.95
    road_attr_confidence: float = 0.5


class GPSPosition(BaseModel):
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)


class IncidentProfile(BaseModel):
    category: EmergencyCategory
    priority: EmergencyPriority = EmergencyPriority.MEDIUM
    medical_subtype: Optional[MedicalSubType] = None
    description: Optional[str] = None
    num_patients: int = 1
    requires_special_equipment: bool = False


class VehicleProfile(BaseModel):
    vehicle_class: VehicleClass
    max_width_meters: float = 2.5
    max_height_meters: float = 3.0
    max_weight_tons: float = 5.0
    can_handle_steep_grades: bool = True
    min_road_width_meters: float = 3.0
    requires_paved_road: bool = True


class EmergencyRequest(BaseModel):
    origin: GPSPosition
    destination: GPSPosition
    incident: IncidentProfile
    vehicle: VehicleProfile
    requesting_unit_id: Optional[str] = None
    timestamp: Optional[str] = None


class RoutePoint(BaseModel):
    latitude: float
    longitude: float
    street_name: Optional[str] = None


class RouteSegment(BaseModel):
    start: RoutePoint
    end: RoutePoint
    distance_km: float
    duration_seconds: float
    # Legacy numeric fields kept for backward compat; frontends should read *_metric for provenance
    traffic_level: float = 0.0
    road_quality: float = 1.0
    weather_condition: str = "clear"
    is_highway: bool = False
    road_width_meters: float = 5.0
    bridge_clearance_meters: float = 5.0
    # Sourced metrics
    traffic: Optional[MetricValue] = None
    road_quality_metric: Optional[MetricValue] = None
    road_width: Optional[MetricValue] = None
    bridge_clearance: Optional[MetricValue] = None
    weather: Optional[WeatherMetric] = None


class CandidateRoute(BaseModel):
    route_id: str
    segments: List[RouteSegment]
    total_distance_km: float
    total_duration_seconds: float
    total_score: float = 0.0
    polyline: Optional[str] = None
    # Provenance
    is_simulated: bool = False
    provider: str = "unknown"
    data_quality: Optional[DataQuality] = None
    confidence: float = 0.5
    feasibility: str = "compatible"  # compatible | risky | impossible
    feasibility_reasons: List[str] = Field(default_factory=list)
    warnings: List[str] = Field(default_factory=list)
    # Geometry-derived features
    num_turns: int = 0
    major_road_pct: float = 0.0
    narrow_road_pct: float = 0.0
    avg_bearing_change_deg: float = 0.0


class RouteScore(BaseModel):
    route_id: str
    time_score: float
    traffic_score: float
    road_quality_score: float
    incident_comfort_score: float
    vehicle_suitability_score: float
    weather_score: float
    driver_condition_score: float
    constraint_penalties: float
    total_score: float
    # Extended breakdown
    eta_score: Optional[float] = None
    reliability_score: Optional[float] = None
    comfort_score: Optional[float] = None
    turn_score: Optional[float] = None
    major_road_score: Optional[float] = None


class RouteExplanation(BaseModel):
    route_id: str
    recommended: bool
    summary: str
    reasons: List[str]
    warnings: List[str]
    confidence_score: float
    # Extended explainability
    recommendation_reasons: List[str] = Field(default_factory=list)
    rejected_routes: List[dict] = Field(default_factory=list)
    tradeoffs: List[str] = Field(default_factory=list)
    data_quality: Optional[DataQuality] = None


class OptimizedRouteResult(BaseModel):
    best_route: CandidateRoute
    all_routes: List[CandidateRoute]
    scores: List[RouteScore]
    explanation: RouteExplanation
    alternative_routes_count: int
    # Overall
    route_score: Optional[float] = None
    confidence: Optional[float] = None
    data_quality: Optional[DataQuality] = None
    provider: Optional[str] = None
    is_simulated: bool = False
    request_id: Optional[str] = None


class GPSUpdate(BaseModel):
    vehicle_id: str
    position: GPSPosition
    speed_kmh: float = 0.0
    heading: float = 0.0
    timestamp: str


class RerouteResponse(BaseModel):
    should_reroute: bool
    new_route: Optional[CandidateRoute] = None
    reason: Optional[str] = None
    updated_explanation: Optional[RouteExplanation] = None
    current_route_health: Optional[dict] = None
    improvement: Optional[float] = None
    hysteresis_applied: bool = False
