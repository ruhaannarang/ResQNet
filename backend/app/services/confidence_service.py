from typing import List
from ..models.schemas import CandidateRoute, DataQuality, DataSource, RouteScore

class ConfidenceService:
    """
    Calculates confidence for each route based on data quality.
    Confidence decreases when:
    - Data is estimated
    - Traffic data unavailable
    - Weather unavailable
    - Road restrictions unknown
    - Routing provider unreliable (mock/simulated)
    """

    @staticmethod
    def compute_route_confidence(route: CandidateRoute, scores: List[RouteScore] | None = None) -> float:
        # Base confidence from geometry provider
        if route.is_simulated:
            base = 0.45
        elif route.provider == "google":
            base = 0.95  # Google has live traffic
        elif route.provider == "osrm":
            base = 0.88  # Real geometry but no live traffic
        else:
            base = 0.60

        dq = route.data_quality
        if dq:
            # Downgrade for estimated attributes — use data-quality confidences where available
            if dq.traffic == DataSource.ESTIMATED:
                base -= 0.12
                # fine-tune by traffic confidence
                base -= max(0, 0.55 - dq.traffic_confidence) * 0.1
            elif dq.traffic == DataSource.UNAVAILABLE:
                base -= 0.20
            elif dq.traffic == DataSource.SIMULATED:
                base -= 0.18
            if dq.weather == DataSource.UNAVAILABLE:
                base -= 0.10
            elif dq.weather == DataSource.ESTIMATED:
                base -= 0.05
            elif dq.weather == DataSource.SIMULATED:
                base -= 0.08
            if dq.road_attributes == DataSource.ESTIMATED:
                base -= 0.08
            elif dq.road_attributes == DataSource.SIMULATED:
                base -= 0.10
            if dq.is_simulated:
                base = min(base, 0.55)
            # Blend in the weighted data-quality confidence for granularity
            weighted_dq = (
                dq.geometry_confidence * 0.4
                + dq.traffic_confidence * 0.25
                + dq.weather_confidence * 0.15
                + dq.road_attr_confidence * 0.2
            )
            # pull base 20% toward weighted_dq so routes with better underlying confidences score higher
            base = base * 0.8 + weighted_dq * 0.2

        # Penalty for risky routes
        if route.feasibility == "risky":
            base -= 0.10
        if route.feasibility == "impossible":
            base -= 0.30

        # If many segments with estimated width/clearance
        estimated_segments = sum(1 for s in route.segments if s.road_width and s.road_width.source == DataSource.ESTIMATED)
        if estimated_segments / max(len(route.segments),1) > 0.6:
            base -= 0.07
        elif estimated_segments / max(len(route.segments),1) > 0.3:
            base -= 0.03

        # Dynamic per-route variance: actual traffic / road quality / weather
        if route.segments:
            avg_traffic = sum(s.traffic_level for s in route.segments) / len(route.segments)
            avg_quality = sum(s.road_quality for s in route.segments) / len(route.segments)
            # Higher congestion or poorer roads -> slightly lower confidence
            base -= avg_traffic * 0.07  # 0.1 traffic => -0.007, 0.8 => -0.056
            base -= (1 - avg_quality) * 0.07  # 0.9 quality => -0.007, 0.5 => -0.035
            # Adverse weather
            adverse = sum(1 for s in route.segments if s.weather_condition in ("rain", "snow", "storm", "fog", "drizzle"))
            if adverse:
                base -= min(0.06, (adverse / len(route.segments)) * 0.10)
            # Very long routes slightly less confident
            if len(route.segments) > 40:
                base -= 0.02
            # Small deterministic jitter from route_id to avoid identical 0.61 for every single-route request
            # Hash first two hex chars to 0-0.02 range so alternatives separate visibly
            try:
                jitter = (int(route.route_id[:2], 16) % 20) / 1000.0  # 0.000-0.019
                base += jitter
            except Exception:
                pass

        # Optional: if scores provided, slightly lower confidence for high total_score (worse routes)
        if scores:
            # find this route's score
            for sc in scores:
                if sc.route_id == route.route_id:
                    # total_score is 0-10 penalty scale; high => less confident
                    base -= min(0.04, sc.total_score / 100.0)
                    break

        return max(0.15, min(0.99, round(base, 2)))

    @staticmethod
    def compute_overall_confidence(routes: List[CandidateRoute]) -> float:
        if not routes:
            return 0.0
        avg = sum(ConfidenceService.compute_route_confidence(r) for r in routes) / len(routes)
        return round(avg, 2)

    @staticmethod
    def build_data_quality(
        provider: str,
        is_simulated: bool,
        has_live_traffic: bool = False,
        weather_source: DataSource = DataSource.ESTIMATED,
        weather_confidence: float = 0.5,
    ) -> DataQuality:
        if is_simulated:
            return DataQuality(
                traffic=DataSource.SIMULATED,
                weather=DataSource.UNAVAILABLE,
                road_geometry=DataSource.SIMULATED,
                road_attributes=DataSource.ESTIMATED,
                is_simulated=True,
                provider=provider,
                traffic_confidence=0.30,
                weather_confidence=0.0,
                geometry_confidence=0.30,
                road_attr_confidence=0.35,
            )
        if provider == "google" and has_live_traffic:
            return DataQuality(
                traffic=DataSource.PROVIDER,
                weather=weather_source,
                road_geometry=DataSource.PROVIDER,
                road_attributes=DataSource.ESTIMATED,
                is_simulated=False,
                provider=provider,
                traffic_confidence=0.90,
                weather_confidence=weather_confidence,
                geometry_confidence=0.95,
                road_attr_confidence=0.55,
            )
        # OSRM
        return DataQuality(
            traffic=DataSource.ESTIMATED,
            weather=weather_source,
            road_geometry=DataSource.PROVIDER,
            road_attributes=DataSource.ESTIMATED,
            is_simulated=False,
            provider=provider,
            traffic_confidence=0.55,
            weather_confidence=weather_confidence,
            geometry_confidence=0.92,
            road_attr_confidence=0.50,
        )
