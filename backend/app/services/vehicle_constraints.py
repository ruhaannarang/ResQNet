from typing import List, Tuple
from ..models.schemas import CandidateRoute, VehicleProfile, IncidentProfile
from ..models.enums import VehicleClass, EmergencyCategory, MedicalSubType

class ConstraintViolation(BaseModelLike := object):
    pass

class VehicleConstraints:
    """
    Feasibility layer:
    Route -> Segment analysis -> Hard constraint validation -> Route rejected OR allowed -> Optimization scoring
    Distinguishes: impossible (hard fail), risky (warning), compatible (safe)
    """

    @staticmethod
    def check_route(
        route: CandidateRoute, vehicle: VehicleProfile, incident: IncidentProfile
    ) -> Tuple[str, List[str], List[str]]:
        """
        Returns (feasibility, hard_violations, warnings)
        feasibility in {"impossible", "risky", "compatible"}
        """
        hard_violations: List[str] = []
        warnings: List[str] = []

        for idx, seg in enumerate(route.segments):
            seg_label = f"Segment {idx+1}"

            # Hard: road width
            if seg.road_width_meters < vehicle.min_road_width_meters - 1e-6:
                hard_violations.append(
                    f"{seg_label}: Road width {seg.road_width_meters:.1f}m < required {vehicle.min_road_width_meters:.1f}m"
                )
            elif seg.road_width_meters - vehicle.min_road_width_meters < 0.5:
                # Tight but possible - risky
                warnings.append(
                    f"{seg_label}: Narrow road {seg.road_width_meters:.1f}m (margin {seg.road_width_meters - vehicle.min_road_width_meters:.1f}m) - risky for {vehicle.vehicle_class}"
                )

            # Hard: bridge clearance
            if seg.bridge_clearance_meters < vehicle.max_height_meters - 1e-6:
                hard_violations.append(
                    f"{seg_label}: Bridge clearance {seg.bridge_clearance_meters:.1f}m < vehicle height {vehicle.max_height_meters:.1f}m"
                )
            elif seg.bridge_clearance_meters - vehicle.max_height_meters < 0.5:
                warnings.append(
                    f"{seg_label}: Low clearance {seg.bridge_clearance_meters:.1f}m (margin {seg.bridge_clearance_meters - vehicle.max_height_meters:.1f}m)"
                )

            # Hard: paved requirement
            if vehicle.requires_paved_road and seg.road_quality < 0.3:
                hard_violations.append(
                    f"{seg_label}: Unpaved / very poor road (quality {seg.road_quality:.2f}) not suitable for this vehicle"
                )
            elif seg.road_quality < 0.45:
                # Incident-aware: cardiac allows poorer roads, spinal/maternity very strict
                threshold = 0.45
                if incident.category == EmergencyCategory.MEDICAL:
                    if incident.medical_subtype == MedicalSubType.CARDIAC:
                        threshold = 0.30  # cardiac allows rougher
                    elif incident.medical_subtype == MedicalSubType.SPINAL:
                        threshold = 0.60  # spinal very strict
                    elif incident.medical_subtype == MedicalSubType.MATERNITY:
                        threshold = 0.55
                if seg.road_quality < threshold:
                    warnings.append(f"{seg_label}: Poor road quality {seg.road_quality:.2f} - patient comfort risk (threshold {threshold})")

            # Weight: soft warning unless weight data available (currently estimated, so never hard fail on weight)
            # But if weight is explicitly very low quality and vehicle heavy, warn
            if vehicle.max_weight_tons >= 10 and seg.road_quality < 0.5:
                warnings.append(f"{seg_label}: Heavy vehicle ({vehicle.max_weight_tons}t) on weak road - possible weight limit")

            # Grade: fire trucks / rescue vans need paved + moderate quality but can_handle_steep_grades flag
            # If vehicle cannot handle steep grades and road_quality indicates grade issues (proxy), warn
            if not vehicle.can_handle_steep_grades and seg.road_quality < 0.4:
                warnings.append(f"{seg_label}: Steep grade risk for vehicle that cannot handle steep grades")

            # Restricted roads: currently proxied by is_highway flag
            # Fire trucks penalized on highways? Actually should prefer non-highway for access - but treat as soft
            # Police prefers highway - no hard fail

        # Category-specific hard rules
        if vehicle.vehicle_class == VehicleClass.FIRE_TRUCK:
            # Fire truck needs at least 4m width for many segments? Already checked via min_road_width
            # But add aggregated check: if >50% segments are narrow (<4.5m), mark risky
            narrow_count = sum(1 for s in route.segments if s.road_width_meters < 4.5)
            if narrow_count / max(len(route.segments), 1) > 0.5 and not hard_violations:
                warnings.append(f"Fire truck: {narrow_count}/{len(route.segments)} segments <4.5m - risky urban access")

        if hard_violations:
            return "impossible", hard_violations, warnings
        if warnings:
            return "risky", [], warnings
        return "compatible", [], []

    @staticmethod
    def is_feasible(feasibility: str) -> bool:
        return feasibility != "impossible"
