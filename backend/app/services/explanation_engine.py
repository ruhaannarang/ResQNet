from typing import List
from ..models.schemas import (
    CandidateRoute, RouteScore, RouteExplanation, IncidentProfile, VehicleProfile
)
from ..models.enums import EmergencyCategory, MedicalSubType


class ExplanationEngine:
    def generate_explanation(
        self,
        best_route: CandidateRoute,
        best_score: RouteScore,
        all_scored: List[tuple],
        incident: IncidentProfile,
        vehicle: VehicleProfile,
    ) -> RouteExplanation:
        reasons = []
        warnings = []

        if len(all_scored) > 1:
            second_best = all_scored[1][1] if len(all_scored) > 1 else None
            if second_best:
                time_diff = second_best.time_score - best_score.time_score
                if time_diff > 0.1:
                    reasons.append(
                        f"Faster arrival: saves ~{time_diff * 3600:.0f} seconds vs next best route"
                    )

        if best_score.traffic_score < 3:
            reasons.append("Selected route avoids severe traffic congestion")
        else:
            warnings.append("Moderate traffic on selected route")

        if best_score.road_quality_score < 2:
            reasons.append("Route has good road surface quality")
        else:
            warnings.append("Some road segments have poor surface quality")

        if best_score.vehicle_suitability_score < 1:
            reasons.append("Route fully satisfies vehicle physical constraints")
        else:
            warnings.append("Some segments may be challenging for this vehicle class")

        if incident.category == EmergencyCategory.MEDICAL:
            if incident.medical_subtype == MedicalSubType.SPINAL:
                reasons.append("Route prioritizes smooth road surface for spinal injury patient")
            elif incident.medical_subtype == MedicalSubType.CARDIAC:
                reasons.append("Route prioritizes fastest arrival time for cardiac emergency")
            elif incident.medical_subtype == MedicalSubType.MATERNITY:
                reasons.append("Route chosen for smooth ride comfort")

        if incident.category == EmergencyCategory.FIRE:
            reasons.append("Route evaluated for fire-truck access, road width, and clearance")
        elif incident.category == EmergencyCategory.POLICE:
            reasons.append("Route prioritizes rapid response for police dispatch")
        elif incident.category == EmergencyCategory.DISASTER:
            reasons.append("Route prioritizes road quality and vehicle access for disaster response")

        if incident.priority.value in ("high", "critical"):
            reasons.append(f"{incident.priority.value.capitalize()} priority increases the cost of delay")
        if incident.num_patients > 1:
            reasons.append(f"Route scoring accounts for {incident.num_patients} patients")

        if best_score.weather_score < 1:
            reasons.append("Favorable weather conditions on route")
        elif best_score.weather_score > 3:
            warnings.append("Adverse weather conditions may affect travel")

        if not reasons:
            reasons.append("Route provides the best overall balance of speed, safety, and comfort")

        summary = self._build_summary(best_route, best_score, incident, reasons, warnings)

        confidence = max(0.5, min(0.99, 1.0 - (best_score.total_score / 30)))

        return RouteExplanation(
            route_id=best_route.route_id,
            recommended=True,
            summary=summary,
            reasons=reasons,
            warnings=warnings,
            confidence_score=round(confidence, 2),
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
