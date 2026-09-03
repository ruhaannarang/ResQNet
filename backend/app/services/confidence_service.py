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
            # Downgrade for estimated attributes
            if dq.traffic == DataSource.ESTIMATED:
                base -= 0.12
            elif dq.traffic == DataSource.UNAVAILABLE:
                base -= 0.20
            if dq.weather == DataSource.UNAVAILABLE:
                base -= 0.10
            elif dq.weather == DataSource.ESTIMATED:
                base -= 0.05
            if dq.road_attributes == DataSource.ESTIMATED:
                base -= 0.08
            if dq.is_simulated:
                base = min(base, 0.55)

        # Penalty for risky routes
        if route.feasibility == "risky":
            base -= 0.10
        if route.feasibility == "impossible":
            base -= 0.30

        # If many segments with estimated width/clearance
        estimated_segments = sum(1 for s in route.segments if s.road_width and s.road_width.source == DataSource.ESTIMATED)
        if estimated_segments / max(len(route.segments),1) > 0.6:
            base -= 0.07

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
