import math
import time
from typing import Optional, Dict, Any, List
from ..models.schemas import CandidateRoute, RouteSegment, GPSPosition, GPSUpdate
from ..models.enums import EmergencyCategory

class ReroutingService:
    """
    1. Current GPS position tracking
    2. Remaining route calculation
    3. Periodic route health evaluation
    4. Trigger rerouting when:
       - ETA increases significantly
       - Traffic increases
       - Route becomes unavailable
       - Vehicle constraint becomes invalid
       - Weather creates risk
    With hysteresis to avoid constant switching.
    Only reroute if new_route_improvement > threshold and current_degradation > threshold
    """

    def __init__(
        self,
        improvement_threshold: float = 0.15,
        degradation_threshold: float = 0.12,
        min_interval_seconds: int = 60,
    ):
        self.improvement_threshold = improvement_threshold
        self.degradation_threshold = degradation_threshold
        self.min_interval_seconds = min_interval_seconds
        self._last_reroute_ts: float = 0

    def evaluate(
        self,
        gps_update: GPSUpdate,
        current_route: Optional[CandidateRoute],
        alternative_routes: Optional[List[CandidateRoute]] = None,
        current_weather_risk: float = 0,
        new_best_route: Optional[CandidateRoute] = None,
    ) -> Dict[str, Any]:
        if current_route is None:
            return {
                "should_reroute": False,
                "reason": "No current route to evaluate against",
                "hysteresis_applied": False,
            }

        now = time.time()
        if now - self._last_reroute_ts < self.min_interval_seconds:
            return {
                "should_reroute": False,
                "reason": f"Reroute suppressed by hysteresis: {self.min_interval_seconds - (now - self._last_reroute_ts):.0f}s remaining",
                "hysteresis_applied": True,
            }

        # Find closest segment and remaining
        closest_idx = self._find_closest_segment_index(gps_update.position, current_route)
        remaining_segs = current_route.segments[closest_idx:] if closest_idx is not None else current_route.segments
        remaining_time = sum(s.duration_seconds for s in remaining_segs)
        remaining_dist = sum(s.distance_km for s in remaining_segs)
        avg_congestion = sum(s.traffic_level for s in remaining_segs) / max(len(remaining_segs),1)
        avg_quality = sum(s.road_quality for s in remaining_segs) / max(len(remaining_segs),1)

        health = {
            "remaining_segments": len(remaining_segs),
            "remaining_time_seconds": remaining_time,
            "remaining_distance_km": remaining_dist,
            "avg_congestion": round(avg_congestion,3),
            "avg_road_quality": round(avg_quality,3),
            "closest_segment_index": closest_idx,
            "weather_risk": current_weather_risk,
        }

        triggers = []
        degradation_score = 0

        # 1. High congestion
        if avg_congestion > 0.75:
            triggers.append(f"High congestion {avg_congestion:.0%} on remaining route")
            degradation_score += 0.65
        elif avg_congestion > 0.60:
            triggers.append(f"Moderate congestion {avg_congestion:.0%}")
            degradation_score += 0.20

        # 2. Long remaining time (ETA blowup)
        if remaining_time > 1800:
            triggers.append(f"Long remaining ETA {remaining_time/60:.0f} min")
            degradation_score += 0.2

        # 3. Vehicle constraint invalid on remaining segments
        infeasible = [s for s in remaining_segs if s.road_width_meters < 3.0 or s.bridge_clearance_meters < 2.8]
        if infeasible:
            triggers.append(f"{len(infeasible)} remaining segments violate vehicle constraints")
            degradation_score += 0.8

        # 4. Weather risk
        if current_weather_risk > 5:
            triggers.append(f"Adverse weather risk {current_weather_risk}/10")
            degradation_score += 0.25

        # 5. Route blocked (if road_quality very low)
        blocked = [s for s in remaining_segs if s.road_quality < 0.2]
        if blocked:
            triggers.append(f"{len(blocked)} segments blocked/very poor")
            degradation_score += 0.7

        # Compare to new route if available
        improvement = 0.0
        if new_best_route:
            new_time = new_best_route.total_duration_seconds
            # Estimate new time from current position: scale by remaining distance ratio?
            # Simplified: compare remaining_time vs new_time
            if remaining_time > 0:
                improvement = (remaining_time - new_time) / remaining_time
                if improvement > 0.05:
                    triggers.append(f"New route saves {improvement:.0%} time ({remaining_time:.0f}s -> {new_time:.0f}s)")
        else:
            # If no new route, degradation alone can trigger reroute request to fetch new route
            pass

        # Apply hysteresis thresholds
        should_reroute = False
        reason = "Current route still optimal"
        hysteresis = False

        # Only reroute if degradation > threshold AND (if new route exists, improvement > threshold)
        if degradation_score >= self.degradation_threshold:
            if new_best_route:
                if improvement >= self.improvement_threshold:
                    should_reroute = True
                    reason = f"Degradation {degradation_score:.2f} > {self.degradation_threshold} and improvement {improvement:.0%} > {self.improvement_threshold:.0%}: " + "; ".join(triggers)
                else:
                    reason = f"Degraded ({degradation_score:.2f}) but new route improvement {improvement:.0%} < threshold {self.improvement_threshold:.0%} - hold"
                    hysteresis = True
            else:
                # Degraded enough to request rerouting fetch
                if degradation_score > 0.5:
                    should_reroute = True
                    reason = f"Route degraded ({degradation_score:.2f}): " + "; ".join(triggers) + " - recommend re-optimization"
                else:
                    reason = "; ".join(triggers) if triggers else reason

        # Strong triggers override hysteresis for safety
        if infeasible or blocked:
            should_reroute = True
            reason = "CRITICAL: Remaining route infeasible/blocked - immediate reroute required: " + "; ".join(triggers)
            hysteresis = False

        if should_reroute:
            self._last_reroute_ts = now

        return {
            "should_reroute": should_reroute,
            "reason": reason,
            "current_route_health": health,
            "improvement": round(improvement,3) if new_best_route else None,
            "hysteresis_applied": hysteresis,
            "triggers": triggers,
            "degradation_score": round(degradation_score,3),
        }

    def _find_closest_segment_index(self, pos: GPSPosition, route: CandidateRoute) -> Optional[int]:
        if not route.segments:
            return None
        best_idx = 0
        best_dist = float("inf")
        for idx, seg in enumerate(route.segments):
            d1 = self._haversine(pos.latitude, pos.longitude, seg.start.latitude, seg.start.longitude)
            d2 = self._haversine(pos.latitude, pos.longitude, seg.end.latitude, seg.end.longitude)
            d = min(d1,d2)
            if d < best_dist:
                best_dist = d
                best_idx = idx
        return best_idx

    def _haversine(self, lat1, lon1, lat2, lon2):
        R=6371
        dlat=math.radians(lat2-lat1)
        dlon=math.radians(lon2-lon1)
        a=math.sin(dlat/2)**2 + math.cos(math.radians(lat1))*math.cos(math.radians(lat2))*math.sin(dlon/2)**2
        return R*2*math.atan2(math.sqrt(a), math.sqrt(1-a))
