from typing import List, Dict, Any
from ..models.schemas import (
    CandidateRoute, RouteScore, RouteExplanation, IncidentProfile, VehicleProfile, DataQuality, DataSource
)
from ..models.enums import EmergencyCategory, MedicalSubType
from .confidence_service import ConfidenceService


class ExplanationEngine:
    def generate_explanation(
        self,
        best_route: CandidateRoute,
        best_score: RouteScore,
        all_scored: List[tuple],
        incident: IncidentProfile,
        vehicle: VehicleProfile,
        rejected_routes: List[Dict[str, Any]] | None = None,
        weather_data: Dict[str, Any] | None = None,
    ) -> RouteExplanation:
        reasons = []
        warnings = []
        recommendation_reasons: List[str] = []
        tradeoffs: List[str] = []

        # WHY selected - primary reasons
        if len(all_scored) > 1:
            second_best = all_scored[1][1] if len(all_scored) > 1 else None
            if second_best:
                time_diff = second_best.time_score - best_score.time_score
                if time_diff > 0.1:
                    reasons.append(
                        f"Faster arrival: saves ~{time_diff * 3600:.0f} seconds vs next best route"
                    )
                    recommendation_reasons.append(f"Fastest ETA among alternatives (saves {time_diff*3600:.0f}s)")

        if best_score.traffic_score < 3:
            reasons.append("Selected route avoids severe traffic congestion")
            recommendation_reasons.append("Low traffic compared to alternatives")
        elif best_score.traffic_score >= 5:
            warnings.append("Moderate to heavy traffic on selected route")
        else:
            warnings.append("Moderate traffic on selected route")

        if best_score.road_quality_score < 2:
            reasons.append("Route has good road surface quality")
            recommendation_reasons.append("Good road quality for vehicle stability")
        else:
            warnings.append("Some road segments have poor surface quality")
            tradeoffs.append("Balances speed vs road quality - some segments are rough")

        if best_route.feasibility == "compatible":
            reasons.append("Route fully satisfies vehicle physical constraints")
            recommendation_reasons.append(f"Vehicle {vehicle.vehicle_class} fully compatible (width {vehicle.min_road_width_meters}m, height {vehicle.max_height_meters}m)")
        elif best_route.feasibility == "risky":
            warnings.append(f"Route is feasible but has warnings: {'; '.join(best_route.warnings[:2])}")
            tradeoffs.append("Risky but feasible - narrow/low clearance segments require caution")
        else:
            warnings.append("Route has hard constraint violations but is least-bad option")

        # Confidence-aware data quality warnings
        if best_route.data_quality:
            dq = best_route.data_quality
            if dq.traffic == DataSource.ESTIMATED:
                warnings.append("Traffic is estimated (OSRM has no live traffic) - confidence reduced")
            if dq.road_attributes == DataSource.ESTIMATED:
                warnings.append("Road width/clearance estimated - not surveyed live")
            if dq.weather == DataSource.UNAVAILABLE:
                warnings.append("Weather data unavailable - assumed clear but confidence lowered")
            elif dq.weather == DataSource.ESTIMATED:
                warnings.append("Weather is estimated - check local conditions")
            if dq.is_simulated:
                warnings.append("⚠️ SIMULATED GEOMETRY: Not real roads - demo mode only")

        if incident.category == EmergencyCategory.MEDICAL:
            if incident.medical_subtype == MedicalSubType.SPINAL:
                reasons.append("Route prioritizes smooth road surface for spinal injury patient")
                recommendation_reasons.append("SPINAL protocol: prioritizes smoothness over raw speed")
            elif incident.medical_subtype == MedicalSubType.CARDIAC:
                reasons.append("Route prioritizes fastest arrival time for cardiac emergency")
                recommendation_reasons.append("CARDIAC protocol: maximum ETA priority")
            elif incident.medical_subtype == MedicalSubType.MATERNITY:
                reasons.append("Route chosen for smooth ride comfort")
            elif incident.medical_subtype == MedicalSubType.TRAUMA:
                recommendation_reasons.append("Trauma protocol: balanced speed & stability")

        if incident.category == EmergencyCategory.FIRE:
            reasons.append("Route evaluated for fire-truck access, road width, and clearance")
            recommendation_reasons.append("Fire strategy: vehicle accessibility critical, penalizes narrow roads")
        elif incident.category == EmergencyCategory.POLICE:
            reasons.append("Route prioritizes rapid response for police dispatch")
            recommendation_reasons.append("Police strategy: prioritizes ETA + congestion avoidance")
        elif incident.category == EmergencyCategory.DISASTER:
            reasons.append("Route prioritizes road quality and vehicle access for disaster response")
            recommendation_reasons.append("Disaster strategy: prioritizes reliability & accessibility")

        if incident.priority.value in ("high", "critical"):
            reasons.append(f"{incident.priority.value.capitalize()} priority increases the cost of delay")
        if incident.num_patients > 1:
            reasons.append(f"Route scoring accounts for {incident.num_patients} patients")

        # Weather influence
        if weather_data:
            cond = weather_data.get("condition", "clear")
            if cond in ("rain", "snow", "storm", "fog"):
                if best_score.weather_score < 3:
                    reasons.append(f"Weather ({cond}) considered - route avoids highest risk segments")
                else:
                    warnings.append(f"Adverse weather ({cond}) may affect travel - visibility/precip risk")

        if not reasons:
            reasons.append("Route provides the best overall balance of speed, safety, and comfort")
        if not recommendation_reasons:
            recommendation_reasons.append("Best overall balance of ETA, road quality, traffic, and vehicle fit")

        summary = self._build_summary(best_route, best_score, incident, reasons, warnings)

        # Confidence from confidence service, not arbitrary score/30
        confidence = ConfidenceService.compute_route_confidence(best_route)
        # Adjust for score quality slightly
        score_penalty = min(0.15, best_score.total_score / 40)
        confidence = max(0.35, min(0.98, confidence - score_penalty))
        # If simulated, cap at 0.55
        if best_route.is_simulated:
            confidence = min(confidence, 0.55)

        # Build rejected list
        rejected = rejected_routes or []
        # If not provided but we have all_scored and feasibility info, infer
        # (caller should pass explicit rejected)

        return RouteExplanation(
            route_id=best_route.route_id,
            recommended=True,
            summary=summary,
            reasons=reasons,
            warnings=warnings,
            confidence_score=round(confidence, 2),
            recommendation_reasons=recommendation_reasons,
            rejected_routes=rejected,
            tradeoffs=tradeoffs,
            data_quality=best_route.data_quality,
        )

    def _build_summary(
        self, route: CandidateRoute, score: RouteScore,
        incident: IncidentProfile, reasons: List[str], warnings: List[str]
    ) -> str:
        eta_min = route.total_duration_seconds / 60
        dist = route.total_distance_km

        cat_label = incident.category.value.capitalize()
        priority_label = incident.priority.value.capitalize()

        parts = [
            f"Recommended {cat_label} route ({priority_label} priority):",
            f"{dist:.1f} km, ETA {eta_min:.0f} min.",
        ]

        if reasons:
            parts.append(reasons[0])

        if warnings:
            parts.append(f"Note: {warnings[0]}")

        return " ".join(parts)
