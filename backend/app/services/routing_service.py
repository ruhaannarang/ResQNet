from typing import List, Optional, Dict, Any
import uuid
from ..models.schemas import (
    EmergencyRequest, CandidateRoute, OptimizedRouteResult,
    RouteScore, RouteExplanation, GPSUpdate, RerouteResponse, DataSource
)
from ..services.route_optimizer import RouteOptimizer
from ..services.explanation_engine import ExplanationEngine
from ..services.routing.providers.factory import get_routes_with_fallback, get_available_providers
from ..services.routing.providers.base import ProviderError
from ..services.weather_service import WeatherService
from ..services.confidence_service import ConfidenceService
from ..services.rerouting_service import ReroutingService
from ..core.config import get_settings

settings = get_settings()

class RoutingService:
    def __init__(self):
        self.optimizer = RouteOptimizer()
        self.explainer = ExplanationEngine()
        self.weather_service = WeatherService()
        self.rerouting_service = ReroutingService(
            improvement_threshold=settings.REROUTE_IMPROVEMENT_THRESHOLD,
            degradation_threshold=settings.REROUTE_DEGRADATION_THRESHOLD,
            min_interval_seconds=settings.REROUTE_MIN_INTERVAL_SECONDS,
        )

    async def process_emergency(self, request: EmergencyRequest) -> OptimizedRouteResult:
        request_id = str(uuid.uuid4())[:8]

        # Fetch weather (origin + midpoint) - influences scoring
        try:
            weather = await self.weather_service.get_weather(request.origin)
        except Exception:
            weather = {
                "condition": "unknown",
                "source": DataSource.UNAVAILABLE.value,
                "confidence": 0.0,
                "note": "Weather fetch failed",
            }

        # Route via provider with fallback
        raw_data = await get_routes_with_fallback(
            origin=request.origin,
            destination=request.destination,
            alternatives=True,
        )

        raw_routes = raw_data.get("routes", [])
        provider = raw_data.get("source", "unknown")
        is_simulated = raw_data.get("is_simulated", False)

        if not raw_routes:
            raise ProviderError("No routes returned by provider", provider, status_code=404)

        # Data quality
        has_live_traffic = any(r.get("has_live_traffic") for r in raw_routes)
        weather_source = DataSource.PROVIDER if weather.get("source") == DataSource.PROVIDER.value else (
            DataSource.UNAVAILABLE if weather.get("source") == DataSource.UNAVAILABLE.value else DataSource.ESTIMATED
        )
        data_quality = ConfidenceService.build_data_quality(
            provider=provider,
            is_simulated=is_simulated,
            has_live_traffic=has_live_traffic,
            weather_source=weather_source,
            weather_confidence=weather.get("confidence", 0.5),
        )

        # Build candidates with provenance
        candidates = self.optimizer.build_candidate_routes(
            raw_routes, request.incident, request.vehicle,
            provider=provider, is_simulated=is_simulated,
            data_quality=data_quality, weather_data=weather
        )

        # Feasibility layer: distinguish impossible / risky / compatible
        compatible: List[CandidateRoute] = []
        risky: List[CandidateRoute] = []
        impossible: List[CandidateRoute] = []
        for c in candidates:
            if c.feasibility == "impossible":
                impossible.append(c)
            elif c.feasibility == "risky":
                risky.append(c)
            else:
                compatible.append(c)

        # Scoring: if we have compatible, score only those; otherwise risky; otherwise impossible (least-bad)
        if compatible:
            to_score = compatible
        elif risky:
            to_score = risky
        else:
            # No feasible route - return least-bad but mark as rejected logic
            to_score = impossible if impossible else candidates
            if not to_score:
                raise ProviderError("No feasible routes were generated", provider)

        # If we have no compatible but have risky/impossible, we still want to score all for explanation
        # But selection should prefer compatible > risky > impossible
        scored: List[tuple[CandidateRoute, RouteScore]] = []
        for route in to_score:
            score = self.optimizer.compute_soft_scores(route, request.incident, request.vehicle, weather_data=weather)
            route.total_score = score.total_score
            scored.append((route, score))

        # If we excluded some candidates (e.g., impossible) we still want them for explanation rejected list
        # Build rejected list
        rejected_routes: List[Dict[str, Any]] = []
        for imp in impossible:
            if imp not in [r for r,_ in scored]:
                rejected_routes.append({
                    "route_id": imp.route_id,
                    "reason": "; ".join(imp.feasibility_reasons[:2]) if imp.feasibility_reasons else "Hard constraint violation",
                    "feasibility": imp.feasibility,
                    "distance_km": imp.total_distance_km,
                    "duration_seconds": imp.total_duration_seconds,
                })
        # Also add risky not selected? We'll add after best selected

        best_route, best_score = self.optimizer.select_best(scored, request.incident, request.vehicle)

        # Add risky alternatives that were not selected as tradeoffs
        for route, score in scored:
            if route.route_id != best_route.route_id and route.feasibility == "risky":
                rejected_routes.append({
                    "route_id": route.route_id,
                    "reason": f"Risky but feasible: {'; '.join(route.warnings[:1])}; score {score.total_score:.3f} vs best {best_score.total_score:.3f}",
                    "feasibility": route.feasibility,
                    "distance_km": route.total_distance_km,
                    "duration_seconds": route.total_duration_seconds,
                })

        explanation = self.explainer.generate_explanation(
            best_route, best_score, scored, request.incident, request.vehicle,
            rejected_routes=rejected_routes, weather_data=weather
        )

        all_routes = [r for r, _ in scored]
        # If we have impossible routes, also include them in all_routes for frontend transparency but mark as rejected
        # Keep all_routes as scored only to avoid recommending impossible, but expose rejected separately
        overall_confidence = ConfidenceService.compute_route_confidence(best_route)

        return OptimizedRouteResult(
            best_route=best_route,
            all_routes=all_routes,
            scores=[s for _, s in scored],
            explanation=explanation,
            alternative_routes_count=len(all_routes) - 1,
            route_score=best_score.total_score,
            confidence=overall_confidence,
            data_quality=data_quality,
            provider=provider,
            is_simulated=is_simulated,
            request_id=request_id,
        )

    async def evaluate_reroute(
        self, gps_update: GPSUpdate, current_route: Optional[CandidateRoute] = None
    ) -> RerouteResponse:
        # Enhanced rerouting with hysteresis
        if current_route is None:
            return RerouteResponse(
                should_reroute=False,
                reason="No current route to evaluate against",
                current_route_health=None,
                hysteresis_applied=False,
            )

        # Fetch weather for current position to evaluate weather risk
        try:
            weather = await self.weather_service.get_weather(gps_update.position)
            weather_risk = self.weather_service.weather_risk_score(weather)
        except Exception:
            weather_risk = 0

        # Use rerouting service for health + decision (without new route)
        result = self.rerouting_service.evaluate(
            gps_update=gps_update,
            current_route=current_route,
            current_weather_risk=weather_risk,
            new_best_route=None,
        )

        # If should_reroute suggests we should try to compute new route, we could optionally compute it
        # For now return health evaluation; frontend can trigger new optimization if desired
        return RerouteResponse(
            should_reroute=result["should_reroute"],
            reason=result["reason"],
            current_route_health=result.get("current_route_health"),
            improvement=result.get("improvement"),
            hysteresis_applied=result.get("hysteresis_applied", False),
        )

    async def evaluate_reroute_with_new_route(
        self, gps_update: GPSUpdate, current_route: Optional[CandidateRoute], origin: Optional[Any] = None, destination: Optional[Any] = None, incident: Optional[Any] = None, vehicle: Optional[Any] = None
    ) -> RerouteResponse:
        # Full reroute: compute new route from gps position to destination and compare
        if current_route is None or destination is None:
            return await self.evaluate_reroute(gps_update, current_route)

        try:
            weather = await self.weather_service.get_weather(gps_update.position)
            weather_risk = self.weather_service.weather_risk_score(weather)
        except Exception:
            weather_risk = 0
            weather = None

        # Try to get new route
        new_best_route = None
        try:
            raw_data = await get_routes_with_fallback(origin=gps_update.position, destination=destination, alternatives=True)
            raw_routes = raw_data.get("routes", [])
            provider = raw_data.get("source", "unknown")
            is_simulated = raw_data.get("is_simulated", False)
            if raw_routes and incident and vehicle:
                dq = ConfidenceService.build_data_quality(provider, is_simulated, weather_source=DataSource.ESTIMATED)
                candidates = self.optimizer.build_candidate_routes(raw_routes, incident, vehicle, provider, is_simulated, dq, weather)
                # Filter feasible and score
                feasible = [c for c in candidates if c.feasibility != "impossible"] or candidates[:1]
                scored = []
                for r in feasible:
                    s = self.optimizer.compute_soft_scores(r, incident, vehicle, weather)
                    r.total_score = s.total_score
                    scored.append((r,s))
                if scored:
                    new_best_route, _ = self.optimizer.select_best(scored, incident, vehicle)
        except Exception:
            pass

        result = self.rerouting_service.evaluate(
            gps_update=gps_update,
            current_route=current_route,
            current_weather_risk=weather_risk,
            new_best_route=new_best_route,
        )
        return RerouteResponse(
            should_reroute=result["should_reroute"],
            new_route=new_best_route if result["should_reroute"] else None,
            reason=result["reason"],
            current_route_health=result.get("current_route_health"),
            improvement=result.get("improvement"),
            hysteresis_applied=result.get("hysteresis_applied", False),
        )
