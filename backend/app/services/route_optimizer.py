from typing import List, Tuple
from ..models.schemas import (
    CandidateRoute, RouteSegment, RoutePoint, VehicleProfile,
    IncidentProfile, GPSPosition, RouteScore
)
from ..models.enums import EmergencyCategory, MedicalSubType, VehicleClass
import uuid
import math


class RouteOptimizer:
    def __init__(self):
        self.weights = {
            "time": 0.35,
            "traffic": 0.20,
            "road_quality": 0.10,
            "incident_comfort": 0.15,
            "vehicle_suitability": 0.10,
            "weather": 0.05,
            "driver_condition": 0.05,
        }

    def build_candidate_routes(
        self, raw_routes: list, incident: IncidentProfile, vehicle: VehicleProfile
    ) -> List[CandidateRoute]:
        candidates = []
        for route_data in raw_routes:
            segments = self._build_segments(route_data, vehicle)
            total_dist = sum(s.distance_km for s in segments)
            total_dur = sum(s.duration_seconds for s in segments)
            candidate = CandidateRoute(
                route_id=str(uuid.uuid4())[:8],
                segments=segments,
                total_distance_km=round(total_dist, 2),
                total_duration_seconds=round(total_dur),
            )
            candidates.append(candidate)
        return candidates

    def _build_segments(self, route_data: dict, vehicle: VehicleProfile) -> List[RouteSegment]:
        points = route_data.get("points", [])
        if len(points) < 2:
            return []

        segments = []
        raw_distance = float(route_data.get("distance_km") or 0)
        geometric_distance = sum(
            self._haversine_km(points[i]["lat"], points[i]["lng"], points[i + 1]["lat"], points[i + 1]["lng"])
            for i in range(len(points) - 1)
        )
        distance_scale = raw_distance / geometric_distance if geometric_distance else 1.0
        base_speed = float(route_data.get("base_speed_kmh") or 45)
        congestion = max(0.0, min(1.0, float(route_data.get("traffic_congestion", 0.3))))
        road_quality = max(0.0, min(1.0, float(route_data.get("road_quality", 0.8))))
        road_width = float(route_data.get("road_width_meters", 6.0))
        clearance = float(route_data.get("bridge_clearance_meters", 5.0))
        is_highway = bool(route_data.get("is_highway", False))

        for i in range(len(points) - 1):
            p1 = points[i]
            p2 = points[i + 1]
            dist = self._haversine_km(p1["lat"], p1["lng"], p2["lat"], p2["lng"])
            effective_speed = base_speed * (1 - congestion * 0.6)
            scaled_dist = dist * distance_scale
            duration = (scaled_dist / effective_speed) * 3600 if effective_speed > 0 else 3600

            segments.append(RouteSegment(
                start=RoutePoint(latitude=p1["lat"], longitude=p1["lng"]),
                end=RoutePoint(latitude=p2["lat"], longitude=p2["lng"]),
                distance_km=round(scaled_dist, 3),
                duration_seconds=round(duration, 1),
                traffic_level=congestion,
                road_quality=road_quality,
                weather_condition="clear",
                is_highway=is_highway,
                road_width_meters=road_width,
                bridge_clearance_meters=clearance,
            ))
        return segments

    def _haversine_km(self, lat1, lon1, lat2, lon2):
        R = 6371
        dlat = math.radians(lat2 - lat1)
        dlon = math.radians(lon2 - lon1)
        a = (math.sin(dlat / 2) ** 2 +
             math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
             math.sin(dlon / 2) ** 2)
        return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

    def check_hard_constraints(
        self, route: CandidateRoute, vehicle: VehicleProfile, incident: IncidentProfile
    ) -> Tuple[bool, List[str]]:
        violations = []
        for seg in route.segments:
            if seg.road_width_meters < vehicle.min_road_width_meters:
                violations.append(
                    f"Road too narrow: {seg.road_width_meters:.1f}m < {vehicle.min_road_width_meters}m required"
                )
            if seg.bridge_clearance_meters < vehicle.max_height_meters:
                violations.append(
                    f"Bridge clearance insufficient: {seg.bridge_clearance_meters:.1f}m < {vehicle.max_height_meters}m required"
                )
            if vehicle.requires_paved_road and seg.road_quality < 0.3:
                violations.append("Unpaved road not suitable for this vehicle")
        return len(violations) == 0, violations

    def compute_soft_scores(
        self, route: CandidateRoute, incident: IncidentProfile, vehicle: VehicleProfile
    ) -> RouteScore:
        avg_traffic = sum(s.traffic_level for s in route.segments) / max(len(route.segments), 1)
        avg_road_q = sum(s.road_quality for s in route.segments) / max(len(route.segments), 1)

        # Every component is a penalty where lower is better. Values are kept on
        # a roughly 0-10 scale so one component cannot overwhelm the others.
        time_score = route.total_duration_seconds / 3600
        traffic_score = avg_traffic * 10
        road_quality_score = (1 - avg_road_q) * 10
        incident_comfort_score = self._incident_comfort(route, incident)
        vehicle_suit = self._vehicle_suitability(route, vehicle)
        weather_score = self._weather_penalty(route)
        driver_cond = 0.0

        constraint_pen = 0
        for seg in route.segments:
            if seg.traffic_level > 0.8:
                constraint_pen += 1
            if seg.road_quality < 0.4:
                constraint_pen += 1

        weights = self._get_weights(incident, vehicle)
        total = (
            weights["time"] * time_score +
            weights["traffic"] * traffic_score +
            weights["road_quality"] * road_quality_score +
            weights["incident_comfort"] * incident_comfort_score +
            weights["vehicle_suitability"] * vehicle_suit +
            weights["weather"] * weather_score +
            weights["driver_condition"] * driver_cond +
            constraint_pen
        )

        return RouteScore(
            route_id=route.route_id,
            time_score=round(time_score, 3),
            traffic_score=round(traffic_score, 3),
            road_quality_score=round(road_quality_score, 3),
            incident_comfort_score=round(incident_comfort_score, 3),
            vehicle_suitability_score=round(vehicle_suit, 3),
            weather_score=round(weather_score, 3),
            driver_condition_score=round(driver_cond, 3),
            constraint_penalties=round(constraint_pen, 3),
            total_score=round(total, 3),
        )

    def _get_weights(self, incident: IncidentProfile, vehicle: VehicleProfile) -> dict:
        """Build an incident-aware weighting profile instead of using one fixed formula."""
        weights = self.weights.copy()

        # Emergency category changes what "best" means.
        if incident.category == EmergencyCategory.FIRE:
            weights.update(time=0.34, traffic=0.18, road_quality=0.10,
                           incident_comfort=0.05, vehicle_suitability=0.25,
                           weather=0.05, driver_condition=0.03)
        elif incident.category == EmergencyCategory.POLICE:
            weights.update(time=0.48, traffic=0.24, road_quality=0.06,
                           incident_comfort=0.02, vehicle_suitability=0.12,
                           weather=0.05, driver_condition=0.03)
        elif incident.category == EmergencyCategory.DISASTER:
            weights.update(time=0.25, traffic=0.12, road_quality=0.22,
                           incident_comfort=0.05, vehicle_suitability=0.25,
                           weather=0.08, driver_condition=0.03)
        else:  # Medical
            weights.update(time=0.38, traffic=0.18, road_quality=0.12,
                           incident_comfort=0.15, vehicle_suitability=0.10,
                           weather=0.04, driver_condition=0.03)

        # Higher priority and more patients make delay more costly.
        priority_time_boost = {
            "low": 0.00, "medium": 0.02, "high": 0.06, "critical": 0.12
        }[incident.priority.value]
        patient_boost = min(max(incident.num_patients - 1, 0) * 0.02, 0.08)
        weights["time"] += priority_time_boost + patient_boost
        weights["traffic"] += (priority_time_boost + patient_boost) * 0.4

        # Wide/heavy vehicles need a larger physical-fit penalty.
        if vehicle.vehicle_class in (VehicleClass.FIRE_TRUCK, VehicleClass.RESCUE_VAN):
            weights["vehicle_suitability"] += 0.08

        total = sum(weights.values())
        return {key: value / total for key, value in weights.items()}

    def _incident_comfort(self, route: CandidateRoute, incident: IncidentProfile) -> float:
        if incident.category != EmergencyCategory.MEDICAL:
            return 0.0

        avg_quality = sum(s.road_quality for s in route.segments) / max(len(route.segments), 1)
        sharp_turns = sum(1 for s in route.segments if not s.is_highway) / max(len(route.segments), 1)

        if incident.medical_subtype == MedicalSubType.SPINAL:
            return (1 - avg_quality) * 8 + sharp_turns * 4
        elif incident.medical_subtype == MedicalSubType.CARDIAC:
            return 2.0
        elif incident.medical_subtype == MedicalSubType.MATERNITY:
            return (1 - avg_quality) * 6 + sharp_turns * 3
        return 2.0

    def _vehicle_suitability(self, route: CandidateRoute, vehicle: VehicleProfile) -> float:
        penalty = 0
        for seg in route.segments:
            width_margin = seg.road_width_meters - vehicle.min_road_width_meters
            clearance_margin = seg.bridge_clearance_meters - vehicle.max_height_meters
            if width_margin < 1.0:
                penalty += min(5, max(0, 1.0 - width_margin) * 2.5)
            if clearance_margin < 0.7:
                penalty += min(5, max(0, 0.7 - clearance_margin) * 2.5)
        return min(10.0, penalty / max(len(route.segments), 1))

    def _weather_penalty(self, route: CandidateRoute) -> float:
        penalty = 0
        for seg in route.segments:
            if seg.weather_condition in ("rain", "snow", "storm"):
                penalty += 2
            if seg.weather_condition == "fog":
                penalty += 1.5
        return penalty

    def select_best(
        self,
        scored_routes: List[Tuple[CandidateRoute, RouteScore]],
        incident: IncidentProfile,
        vehicle: VehicleProfile,
    ) -> Tuple[CandidateRoute, RouteScore]:
        if not scored_routes:
            raise ValueError("No feasible routes were generated")

        # Compare routes relative to the available alternatives. Absolute ETA
        # in hours can otherwise overwhelm every other factor on long trips.
        weights = self._get_weights(incident, vehicle)
        fields = (
            "time_score", "traffic_score", "road_quality_score",
            "incident_comfort_score", "vehicle_suitability_score",
            "weather_score", "driver_condition_score",
        )
        ranges = {
            field: (
                min(getattr(score, field) for _, score in scored_routes),
                max(getattr(score, field) for _, score in scored_routes),
            )
            for field in fields
        }

        def normalized(field: str, score: RouteScore) -> float:
            low, high = ranges[field]
            if high == low:
                return 0.5
            return (getattr(score, field) - low) / (high - low)

        for _, score in scored_routes:
            relative_score = sum(
                weights[field.replace("_score", "")] * normalized(field, score)
                for field in fields
            )
            score.total_score = round(relative_score, 3)

        scored_routes.sort(key=lambda x: x[1].total_score)
        return scored_routes[0]
