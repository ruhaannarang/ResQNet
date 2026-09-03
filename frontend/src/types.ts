export interface GPSPosition {
  latitude: number
  longitude: number
}

export type EmergencyCategory = 'medical' | 'fire' | 'police' | 'disaster'
export type EmergencyPriority = 'low' | 'medium' | 'high' | 'critical'
export type MedicalSubType = 'cardiac' | 'spinal' | 'ventilator' | 'maternity' | 'trauma' | 'general'
export type VehicleClass = 'ambulance_bls' | 'ambulance_als' | 'fire_truck' | 'police_car' | 'rescue_van'

export interface IncidentProfile {
  category: EmergencyCategory
  priority: EmergencyPriority
  medical_subtype?: MedicalSubType
  description?: string
  num_patients: number
  requires_special_equipment: boolean
}

export interface VehicleProfile {
  vehicle_class: VehicleClass
  max_width_meters: number
  max_height_meters: number
  max_weight_tons: number
  can_handle_steep_grades: boolean
  min_road_width_meters: number
  requires_paved_road: boolean
}

export interface EmergencyRequest {
  origin: GPSPosition
  destination: GPSPosition
  incident: IncidentProfile
  vehicle: VehicleProfile
}

export interface RoutePoint {
  latitude: number
  longitude: number
  street_name?: string
}

export interface RouteSegment {
  start: RoutePoint
  end: RoutePoint
  distance_km: number
  duration_seconds: number
  traffic_level: number
  road_quality: number
  weather_condition: string
  is_highway: boolean
}

export interface CandidateRoute {
  route_id: string
  segments: RouteSegment[]
  total_distance_km: number
  total_duration_seconds: number
  total_score: number
  polyline?: string
}

export interface RouteScore {
  route_id: string
  time_score: number
  traffic_score: number
  road_quality_score: number
  incident_comfort_score: number
  vehicle_suitability_score: number
  weather_score: number
  driver_condition_score: number
  constraint_penalties: number
  total_score: number
}

export interface RouteExplanation {
  route_id: string
  recommended: boolean
  summary: string
  reasons: string[]
  warnings: string[]
  confidence_score: number
}

export interface OptimizedResult {
  best_route: CandidateRoute
  all_routes: CandidateRoute[]
  scores: RouteScore[]
  explanation: RouteExplanation
  alternative_routes_count: number
}
