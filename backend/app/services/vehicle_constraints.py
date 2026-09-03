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

        # Aggregate counters to avoid 42 duplicate warnings
        narrow_segments = []
        low_clearance_segments = []
        poor_segments = []
        heavy_segments = []
        steep_segments = []
        width_fail_segments = []
        clearance_fail_segments = []
        paved_fail_segments = []

        for idx, seg in enumerate(route.segments):
            seg_num = idx + 1
            # Hard: road width
            if seg.road_width_meters < vehicle.min_road_width_meters - 1e-6:
                width_fail_segments.append(seg_num)
            elif seg.road_width_meters - vehicle.min_road_width_meters < 0.5:
                narrow_segments.append(seg_num)

            # Hard: bridge clearance
            if seg.bridge_clearance_meters < vehicle.max_height_meters - 1e-6:
                clearance_fail_segments.append(seg_num)
            elif seg.bridge_clearance_meters - vehicle.max_height_meters < 0.5:
                low_clearance_segments.append(seg_num)

            # Hard: paved requirement
            if vehicle.requires_paved_road and seg.road_quality < 0.3:
                paved_fail_segments.append(seg_num)
            elif seg.road_quality < 0.45:
                # Incident-aware thresholds and messaging
                threshold = 0.45
                is_medical = incident.category == EmergencyCategory.MEDICAL
                if is_medical:
                    if incident.medical_subtype == MedicalSubType.CARDIAC:
                        threshold = 0.30
                    elif incident.medical_subtype == MedicalSubType.SPINAL:
                        threshold = 0.60
                    elif incident.medical_subtype == MedicalSubType.MATERNITY:
                        threshold = 0.55
                else:
                    # Police/Fire/Disaster: more lenient, and not patient comfort
                    threshold = 0.32
                if seg.road_quality < threshold:
                    poor_segments.append(seg_num)

            if vehicle.max_weight_tons >= 10 and seg.road_quality < 0.5:
                heavy_segments.append(seg_num)

            if not vehicle.can_handle_steep_grades and seg.road_quality < 0.4:
                steep_segments.append(seg_num)

        # Convert aggregated counters to single warnings/hard violations
        if width_fail_segments:
            hard_violations.append(f"Road width {route.segments[0].road_width_meters:.1f}m < required {vehicle.min_road_width_meters:.1f}m on {len(width_fail_segments)}/{len(route.segments)} segments")
        elif narrow_segments:
            # Show aggregated narrow warning
            avg_margin = sum(route.segments[i-1].road_width_meters - vehicle.min_road_width_meters for i in narrow_segments) / len(narrow_segments)
            warnings.append(f"Narrow road {route.segments[0].road_width_meters:.1f}m (margin {avg_margin:.1f}m) on {len(narrow_segments)}/{len(route.segments)} segments - risky for {vehicle.vehicle_class}")

        if clearance_fail_segments:
            hard_violations.append(f"Bridge clearance {route.segments[0].bridge_clearance_meters:.1f}m < vehicle height {vehicle.max_height_meters:.1f}m on {len(clearance_fail_segments)}/{len(route.segments)} segments")
        elif low_clearance_segments:
            warnings.append(f"Low clearance {route.segments[0].bridge_clearance_meters:.1f}m on {len(low_clearance_segments)}/{len(route.segments)} segments (margin <0.5m)")

        if paved_fail_segments:
            hard_violations.append(f"Unpaved / very poor road (quality {route.segments[0].road_quality:.2f}) on {len(paved_fail_segments)}/{len(route.segments)} segments - not suitable for this vehicle")
        elif poor_segments:
            avg_q = sum(route.segments[i-1].road_quality for i in poor_segments) / len(poor_segments)
            if incident.category == EmergencyCategory.MEDICAL:
                warnings.append(f"Poor road quality {avg_q:.2f} on {len(poor_segments)}/{len(route.segments)} segments - patient comfort risk")
            else:
                warnings.append(f"Poor road surface {avg_q:.2f} on {len(poor_segments)}/{len(route.segments)} segments - handling/reliability risk")

        if heavy_segments:
            warnings.append(f"Heavy vehicle ({vehicle.max_weight_tons}t) on weak road (quality {route.segments[0].road_quality:.2f}) on {len(heavy_segments)}/{len(route.segments)} segments - possible weight limit")

        if steep_segments:
            warnings.append(f"Steep grade risk on {len(steep_segments)}/{len(route.segments)} segments for vehicle that cannot handle steep grades")

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
