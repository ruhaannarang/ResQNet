from typing import List, Optional
from ..models.schemas import (
    EmergencyRequest, CandidateRoute, OptimizedRouteResult,
    RouteScore, RouteExplanation, GPSUpdate, RerouteResponse
)
from ..services.map_data_service import MapDataService
from ..services.route_optimizer import RouteOptimizer
from ..services.explanation_engine import ExplanationEngine


class RoutingService:
    def __init__(self):
        self.map_service = MapDataService()
        self.optimizer = RouteOptimizer()
        self.explainer = ExplanationEngine()

    async def process_emergency(self, request: EmergencyRequest) -> OptimizedRouteResult:
        raw_data = await self.map_service.get_directions_google(
            origin=request.origin,
            destination=request.destination,
            alternatives=True,
        )

        raw_routes = raw_data.get("routes", [])

        if not raw_routes:
            raw_routes = self.optimizer._mock_directions(
                request.origin, request.destination, True
            ).get("routes", [])

        candidates = self.optimizer.build_candidate_routes(
            raw_routes, request.incident, request.vehicle
        )

        feasible = []
        for c in candidates:
            ok, _ = self.optimizer.check_hard_constraints(
                c, request.vehicle, request.incident
            )
            if ok:
                feasible.append(c)

        if not feasible:
            feasible = candidates[:1]

        scored = []
        for route in feasible:
            score = self.optimizer.compute_soft_scores(
                route, request.incident, request.vehicle
            )
            route.total_score = score.total_score
            scored.append((route, score))

        best_route, best_score = self.optimizer.select_best(
            scored, request.incident, request.vehicle
        )

        explanation = self.explainer.generate_explanation(
            best_route, best_score, scored, request.incident, request.vehicle
        )

        all_routes = [r for r, _ in scored]

        return OptimizedRouteResult(
            best_route=best_route,
            all_routes=all_routes,
            scores=[s for _, s in scored],
            explanation=explanation,
            alternative_routes_count=len(all_routes) - 1,
        )

    async def evaluate_reroute(
        self, gps_update: GPSUpdate, current_route: Optional[CandidateRoute] = None
    ) -> RerouteResponse:
        if current_route is None:
            return RerouteResponse(
                should_reroute=False,
                reason="No current route to evaluate against"
            )

        closest_seg = min(
            current_route.segments,
            key=lambda s: min(
                self._point_dist(gps_update.position.latitude, gps_update.position.longitude,
                                 s.start.latitude, s.start.longitude),
                self._point_dist(gps_update.position.latitude, gps_update.position.longitude,
                                 s.end.latitude, s.end.longitude),
            ),
        )

        remaining_segs = []
        found = False
        for seg in current_route.segments:
            if seg is closest_seg:
                found = True
            if found:
                remaining_segs.append(seg)

        remaining_time = sum(s.duration_seconds for s in remaining_segs)
        remaining_dist = sum(s.distance_km for s in remaining_segs)
        avg_congestion = (
            sum(s.traffic_level for s in remaining_segs) / max(len(remaining_segs), 1)
        )

        if avg_congestion > 0.75 or remaining_time > 1800:
            return RerouteResponse(
                should_reroute=True,
                reason=f"High congestion ({avg_congestion:.0%}) or long remaining time ({remaining_time:.0f}s)",
            )

        return RerouteResponse(
            should_reroute=False,
            reason="Current route still optimal"
        )

    def _point_dist(self, lat1, lon1, lat2, lon2):
        import math
        R = 6371
        dlat = math.radians(lat2 - lat1)
        dlon = math.radians(lon2 - lon1)
        a = (math.sin(dlat / 2) ** 2 +
             math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
             math.sin(dlon / 2) ** 2)
        return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
