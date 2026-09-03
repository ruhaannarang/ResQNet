import logging
from typing import List, Tuple, Dict, Any, Optional
from ..models.schemas import (
    CandidateRoute, RouteSegment, RoutePoint, VehicleProfile,
    IncidentProfile, GPSPosition, RouteScore, DataSource, MetricValue, WeatherMetric, DataQuality
)
from ..models.enums import EmergencyCategory, MedicalSubType, VehicleClass
from .optimization_strategies import get_strategy
from .vehicle_constraints import VehicleConstraints
from .confidence_service import ConfidenceService
from .weather_service import WeatherService
import uuid
import math
logger = logging.getLogger("resqnet.optimizer")


class RouteOptimizer:
    def __init__(self):
        # Legacy weights kept for fallback; strategies now own weighting
        self.weights = {
            "time": 0.35,
            "traffic": 0.20,
            "road_quality": 0.10,
            "incident_comfort": 0.15,
            "vehicle_suitability": 0.10,
            "weather": 0.05,
            "driver_condition": 0.05,
        }
        self.weather_service = WeatherService()

    def build_candidate_routes(
        self, raw_routes: list, incident: IncidentProfile, vehicle: VehicleProfile,
        provider: str = "unknown", is_simulated: bool = False,
        data_quality: Optional[DataQuality] = None, weather_data: Optional[Dict[str, Any]] = None
    ) -> List[CandidateRoute]:
        candidates = []
        for route_data in raw_routes:
            # Determine if this specific route is simulated (mock provider)
            route_is_sim = route_data.get("is_simulated", is_simulated)
            route_provider = route_data.get("source", provider)
            segments = self._build_segments(route_data, vehicle, route_is_sim, route_provider, weather_data)
            total_dist = sum(s.distance_km for s in segments)
            total_dur = sum(s.duration_seconds for s in segments)
            # Geometry-derived features from raw points
            points = route_data.get("points", [])
            turn_info = self._analyze_geometry(points)
            major_pct = sum(1 for s in segments if s.is_highway) / max(len(segments),1)
            narrow_pct = sum(1 for s in segments if s.road_width_meters < 4.5) / max(len(segments),1)
            candidate = CandidateRoute(
                route_id=str(uuid.uuid4())[:8],
                segments=segments,
                total_distance_km=round(total_dist, 2),
                total_duration_seconds=round(total_dur),
                is_simulated=route_is_sim,
                provider=route_provider,
                data_quality=data_quality,
                num_turns=turn_info["num_turns"],
                major_road_pct=round(major_pct, 3),
                narrow_road_pct=round(narrow_pct, 3),
                avg_bearing_change_deg=round(turn_info["avg_bearing_change"], 2),
            )
            # Evaluate feasibility immediately
            feasibility, violations, warnings = VehicleConstraints.check_route(candidate, vehicle, incident)
            candidate.feasibility = feasibility
            candidate.feasibility_reasons = violations
            candidate.warnings = warnings
            # Confidence
            candidate.confidence = ConfidenceService.compute_route_confidence(candidate)
            candidates.append(candidate)
        logger.info(f"Built {len(candidates)} candidates for {incident.category}/{incident.medical_subtype} via {provider}: " + ", ".join([f"{c.route_id}(turns={c.num_turns}, major={c.major_road_pct:.0%}, narrow={c.narrow_road_pct:.0%}, dur={c.total_duration_seconds}s)" for c in candidates]))
        return candidates

    def _analyze_geometry(self, points: List[Dict[str, float]]) -> Dict[str, Any]:
        if len(points) < 3:
            return {"num_turns": 0, "avg_bearing_change": 0.0}
        bearings = []
        for i in range(len(points)-1):
            lat1, lon1 = points[i]["lat"], points[i]["lng"]
            lat2, lon2 = points[i+1]["lat"], points[i+1]["lng"]
            dlon = math.radians(lon2-lon1)
            lat1r, lat2r = math.radians(lat1), math.radians(lat2)
            x = math.sin(dlon) * math.cos(lat2r)
            y = math.cos(lat1r)*math.sin(lat2r) - math.sin(lat1r)*math.cos(lat2r)*math.cos(dlon)
            brng = (math.degrees(math.atan2(x, y)) + 360) % 360
            bearings.append(brng)
        turns = 0
        changes = []
        for i in range(1, len(bearings)):
            diff = abs(bearings[i] - bearings[i-1])
            diff = min(diff, 360-diff)
            changes.append(diff)
            if diff > 30:
                turns += 1
        avg_change = sum(changes)/len(changes) if changes else 0
        return {"num_turns": turns, "avg_bearing_change": avg_change}

    def _build_segments(self, route_data: dict, vehicle: VehicleProfile, is_simulated: bool = False, provider: str = "unknown", weather_data: Optional[Dict[str, Any]] = None) -> List[RouteSegment]:
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

        # Ancillary attributes: determine source/confidence
        # OSRM/Google don't provide width/clearance/quality/traffic reliably - mark as estimated unless mock/guest
        has_mock_values = "_mock_traffic" in route_data
        if has_mock_values:
            congestion = max(0.0, min(1.0, float(route_data.get("_mock_traffic", 0.3))))
            road_quality = max(0.0, min(1.0, float(route_data.get("_mock_quality", 0.8))))
            road_width = float(route_data.get("_mock_width", 6.0))
            clearance = float(route_data.get("_mock_clearance", 5.0))
            traffic_source = DataSource.SIMULATED if is_simulated else DataSource.ESTIMATED
            traffic_conf = 0.35 if is_simulated else 0.55
            attr_source = DataSource.SIMULATED if is_simulated else DataSource.ESTIMATED
            attr_conf = 0.35 if is_simulated else 0.50
        elif provider == "google" and route_data.get("has_live_traffic"):
            # Google gives live traffic via duration_in_traffic
            congestion = max(0.0, min(1.0, float(route_data.get("traffic_congestion", 0.3))))
            traffic_source = DataSource.PROVIDER
            traffic_conf = 0.88
            road_quality = max(0.0, min(1.0, float(route_data.get("road_quality", 0.8))))
            road_width = float(route_data.get("road_width_meters", 6.0))
            clearance = float(route_data.get("bridge_clearance_meters", 5.0))
            attr_source = DataSource.ESTIMATED
            attr_conf = 0.50
        else:
            # OSRM default: estimated congestion/quality/width
            congestion = max(0.0, min(1.0, float(route_data.get("traffic_congestion", 0.3))))
            road_quality = max(0.0, min(1.0, float(route_data.get("road_quality", 0.8))))
            road_width = float(route_data.get("road_width_meters", 6.0))
            clearance = float(route_data.get("bridge_clearance_meters", 5.0))
            # Deterministic estimates based on route_idx - explicitly mark as estimated with low confidence
            traffic_source = DataSource.ESTIMATED
            traffic_conf = 0.55
            attr_source = DataSource.ESTIMATED
            attr_conf = 0.50
            if is_simulated:
                traffic_source = DataSource.SIMULATED
                attr_source = DataSource.SIMULATED
                traffic_conf = 0.30
                attr_conf = 0.30

        is_highway = bool(route_data.get("is_highway", False))

        # Weather per segment: if weather_data provided, use it else estimated
        if weather_data and weather_data.get("source") != DataSource.UNAVAILABLE.value:
            weather_cond = weather_data.get("condition", "clear")
            weather_src = DataSource.PROVIDER if weather_data.get("source") == DataSource.PROVIDER.value else DataSource.ESTIMATED
            weather_conf = weather_data.get("confidence", 0.6)
        else:
            weather_cond = "clear"
            weather_src = DataSource.UNAVAILABLE if weather_data and weather_data.get("source") == DataSource.UNAVAILABLE.value else DataSource.ESTIMATED
            weather_conf = 0.0 if weather_src == DataSource.UNAVAILABLE else 0.50

        for i in range(len(points) - 1):
            p1 = points[i]
            p2 = points[i + 1]
            dist = self._haversine_km(p1["lat"], p1["lng"], p2["lat"], p2["lng"])
            effective_speed = base_speed * (1 - congestion * 0.6)
            # Weather slows down: heavy rain/snow
            if weather_cond in ("rain", "storm") and weather_src != DataSource.UNAVAILABLE:
                effective_speed *= 0.85
            if weather_cond in ("snow", "fog"):
                effective_speed *= 0.75
            scaled_dist = dist * distance_scale
            duration = (scaled_dist / effective_speed) * 3600 if effective_speed > 0 else 3600

            seg = RouteSegment(
                start=RoutePoint(latitude=p1["lat"], longitude=p1["lng"]),
                end=RoutePoint(latitude=p2["lat"], longitude=p2["lng"]),
                distance_km=round(scaled_dist, 3),
                duration_seconds=round(duration, 1),
                traffic_level=congestion,
                road_quality=road_quality,
                weather_condition=weather_cond,
                is_highway=is_highway,
                road_width_meters=road_width,
                bridge_clearance_meters=clearance,
                traffic=MetricValue(value=congestion, source=traffic_source, confidence=traffic_conf,
                                   note="Estimated from route class" if traffic_source==DataSource.ESTIMATED else "Provider live traffic" if traffic_source==DataSource.PROVIDER else "Simulated"),
                road_quality_metric=MetricValue(value=road_quality, source=attr_source, confidence=attr_conf,
                                   note="Estimated - OSM data not queried" if attr_source==DataSource.ESTIMATED else "Simulated"),
                road_width=MetricValue(value=road_width, source=attr_source, confidence=attr_conf,
                                   note="Deterministic estimate based on route index - not surveyed"),
                bridge_clearance=MetricValue(value=clearance, source=attr_source, confidence=attr_conf,
                                   note="Deterministic estimate - not surveyed"),
                weather=WeatherMetric(value=weather_cond, source=weather_src, confidence=weather_conf,
                                   note=weather_data.get("note") if weather_data else None),
            )
            segments.append(seg)
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
        # Delegates to VehicleConstraints but preserves old signature: only impossible counts as fail
        feasibility, violations, warnings = VehicleConstraints.check_route(route, vehicle, incident)
        return feasibility != "impossible", violations

    def check_feasibility(
        self, route: CandidateRoute, vehicle: VehicleProfile, incident: IncidentProfile
    ) -> Tuple[str, List[str], List[str]]:
        return VehicleConstraints.check_route(route, vehicle, incident)

    def compute_soft_scores(
        self, route: CandidateRoute, incident: IncidentProfile, vehicle: VehicleProfile,
        weather_data: Optional[Dict[str, Any]] = None
    ) -> RouteScore:
        avg_traffic = sum(s.traffic_level for s in route.segments) / max(len(route.segments), 1)
        avg_road_q = sum(s.road_quality for s in route.segments) / max(len(route.segments), 1)
        # Geometry-derived
        num_turns = getattr(route, "num_turns", 0)
        major_pct = getattr(route, "major_road_pct", 0)
        narrow_pct = getattr(route, "narrow_road_pct", 0)
        # Turn score 0-10: few turns =0, many turns =10
        turn_score = min(10, (num_turns / max(len(route.segments),1)) * 12)
        major_road_score = (1 - major_pct) * 8  # prefer major roads -> lower penalty when major_pct high
        narrow_penalty = narrow_pct * 8

        # Every component is a penalty where lower is better. Values are kept on
        # a roughly 0-10 scale so one component cannot overwhelm the others.
        time_score = route.total_duration_seconds / 3600
        traffic_score = avg_traffic * 10
        road_quality_score = (1 - avg_road_q) * 10
        incident_comfort_score = self._incident_comfort(route, incident)
        vehicle_suit = self._vehicle_suitability(route, vehicle)
        # incorporate narrow/major into vehicle suitability for fire/disaster
        if incident.category == EmergencyCategory.FIRE:
            vehicle_suit = max(vehicle_suit, narrow_penalty * 1.2)
            # Fire prefers major roads: penalize low major_pct
            vehicle_suit += major_road_score * 0.5
        elif incident.category == EmergencyCategory.DISASTER:
            vehicle_suit = max(vehicle_suit, narrow_penalty)
            # Disaster also prefers reliability
            pass
        # Weather penalty: use service if weather_data available
        if weather_data:
            weather_score = self.weather_service.weather_risk_score(weather_data)
        else:
            weather_score = self._weather_penalty(route)
        driver_cond = 0.0

        # Reliability score: combination of road_quality + traffic + weather + feasibility + narrow
        reliability_score = (road_quality_score * 0.35 + traffic_score * 0.25 + weather_score * 0.25 + narrow_penalty * 0.15)
        if route.feasibility == "risky":
            reliability_score += 2
        if route.feasibility == "impossible":
            reliability_score += 5

        # Comfort score: incident_comfort + turn penalty
        comfort_score = incident_comfort_score + turn_score * 0.3

        constraint_pen = 0
        for seg in route.segments:
            if seg.traffic_level > 0.8:
                constraint_pen += 1
            if seg.road_quality < 0.4:
                constraint_pen += 1
            # Penalize estimated data for risky routes? Not here, but confidence handles it

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
            eta_score=round(time_score,3),
            reliability_score=round(reliability_score,3),
            comfort_score=round(comfort_score,3),
        )

    def _get_weights(self, incident: IncidentProfile, vehicle: VehicleProfile) -> dict:
        """Delegate to OptimizationStrategy; fallback to legacy if not found."""
        try:
            strategy = get_strategy(incident)
            return strategy.get_weights(incident, vehicle)
        except Exception:
            # Fallback legacy
            weights = self.weights.copy()
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
            else:
                weights.update(time=0.38, traffic=0.18, road_quality=0.12,
                               incident_comfort=0.15, vehicle_suitability=0.10,
                               weather=0.04, driver_condition=0.03)
            priority_time_boost = {
                "low": 0.00, "medium": 0.02, "high": 0.06, "critical": 0.12
            }[incident.priority.value]
            patient_boost = min(max(incident.num_patients - 1, 0) * 0.02, 0.08)
            weights["time"] += priority_time_boost + patient_boost
            weights["traffic"] += (priority_time_boost + patient_boost) * 0.4
            if vehicle.vehicle_class in (VehicleClass.FIRE_TRUCK, VehicleClass.RESCUE_VAN):
                weights["vehicle_suitability"] += 0.08
            total = sum(weights.values())
            return {key: value / total for key, value in weights.items()}

    def _incident_comfort(self, route: CandidateRoute, incident: IncidentProfile) -> float:
        if incident.category != EmergencyCategory.MEDICAL:
            return 0.0

        avg_quality = sum(s.road_quality for s in route.segments) / max(len(route.segments), 1)
        # Real turn density from geometry vs proxy
        num_turns = getattr(route, "num_turns", 0)
        turn_density = num_turns / max(len(route.segments), 1)
        # Also bearing change
        avg_bearing = getattr(route, "avg_bearing_change_deg", 0)
        turn_factor = turn_density * 3 + (avg_bearing / 90.0) * 2

        if incident.medical_subtype == MedicalSubType.SPINAL:
            # Extremely high penalty for poor roads and turns
            return (1 - avg_quality) * 10 + turn_factor * 6
        elif incident.medical_subtype == MedicalSubType.CARDIAC:
            # Comfort less important than speed -> low flat penalty
            return 1.0 + turn_factor * 0.3
        elif incident.medical_subtype == MedicalSubType.MATERNITY:
            return (1 - avg_quality) * 7 + turn_factor * 4
        elif incident.medical_subtype == MedicalSubType.TRAUMA:
            return (1 - avg_quality) * 5 + turn_factor * 2
        return (1 - avg_quality) * 4 + turn_factor * 1.5

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

        weights = self._get_weights(incident, vehicle)
        strategy = get_strategy(incident)
        logger.info(f"Emergency type: {incident.category}/{incident.medical_subtype} priority={incident.priority} -> strategy={strategy.name} weights={weights}")

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
        logger.info(f"Ranges for normalization: {ranges}")

        def normalized(field: str, score: RouteScore) -> float:
            low, high = ranges[field]
            if high == low:
                return 0.5
            return (getattr(score, field) - low) / (high - low)

        for route, score in scored_routes:
            logger.info(f"Candidate {route.route_id} raw: time={score.time_score:.3f} traffic={score.traffic_score:.3f} road_q={score.road_quality_score:.3f} comfort={score.incident_comfort_score:.3f} vehicle={score.vehicle_suitability_score:.3f} weather={score.weather_score:.3f} penalty={score.constraint_penalties} turns={route.num_turns} major={route.major_road_pct:.0%} narrow={route.narrow_road_pct:.0%} feasibility={route.feasibility}")
            for field in fields:
                n = normalized(field, score)
                wkey = field.replace("_score", "")
                # weight key mapping
                wk = wkey
                if wk == "incident_comfort":
                    wk = "incident_comfort"
                logger.info(f"  {route.route_id} {field}: raw={getattr(score, field):.3f} norm={n:.3f} weight={weights.get(wk,0):.3f} weighted={weights.get(wk,0)*n:.4f}")

        for _, score in scored_routes:
            relative_score = sum(
                weights[field.replace("_score", "")] * normalized(field, score)
                for field in fields
            )
            score.total_score = round(relative_score, 3)
            logger.info(f"Candidate {score.route_id} final normalized total={score.total_score:.3f}")

        scored_routes.sort(key=lambda x: x[1].total_score)
        best_route, best_score = scored_routes[0]
        logger.info(f"Final ranking: " + " > ".join([f"{r.route_id}({s.total_score:.3f})" for r,s in scored_routes]) + f" => BEST {best_route.route_id} reason: lowest weighted penalty")
        for r, s in scored_routes[1:]:
            logger.info(f"Rejected {r.route_id} reason: higher total {s.total_score:.3f} vs best {best_score.total_score:.3f} (feasibility {r.feasibility})")
        return best_route, best_score

    # Legacy compatibility for routing_service fallback
    def _mock_directions(self, origin, destination, alternatives=True):
        from .routing.providers.mock import MockRoutingProvider
        import asyncio
        provider = MockRoutingProvider()
        # This is sync wrapper; we return the dict that async would return
        # Use asyncio.run if not in event loop, else create direct call
        try:
            loop = asyncio.get_event_loop()
            if loop.is_running():
                # If already in async context, this fallback shouldn't be used sync
                # Provide sync calculation via private method
                return provider._mock_directions(origin, destination, alternatives)
            else:
                return asyncio.run(provider.get_routes(origin, destination, alternatives))
        except RuntimeError:
            return provider._mock_directions(origin, destination, alternatives)
