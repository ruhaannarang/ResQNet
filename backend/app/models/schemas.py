from pydantic import BaseModel, Field
from typing import Optional, List
from .enums import EmergencyCategory, EmergencyPriority, MedicalSubType, VehicleClass


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
    traffic_level: float = 0.0
    road_quality: float = 1.0
    weather_condition: str = "clear"
    is_highway: bool = False
    road_width_meters: float = 5.0
    bridge_clearance_meters: float = 5.0


class CandidateRoute(BaseModel):
    route_id: str
    segments: List[RouteSegment]
    total_distance_km: float
    total_duration_seconds: float
    total_score: float = 0.0
    polyline: Optional[str] = None


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


class RouteExplanation(BaseModel):
    route_id: str
    recommended: bool
    summary: str
    reasons: List[str]
    warnings: List[str]
    confidence_score: float


class OptimizedRouteResult(BaseModel):
    best_route: CandidateRoute
    all_routes: List[CandidateRoute]
    scores: List[RouteScore]
    explanation: RouteExplanation
    alternative_routes_count: int


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
