import hashlib
import math
from typing import Dict, Any
from ....models.schemas import GPSPosition
from .base import RoutingProvider

class MockRoutingProvider(RoutingProvider):
    name = "mock"

    async def get_routes(
        self, origin: GPSPosition, destination: GPSPosition, alternatives: bool = True
    ) -> Dict[str, Any]:
        self._validate_coords(origin, destination)
        return self._mock_directions(origin, destination, alternatives)

    def _mock_directions(
        self, origin: GPSPosition, destination: GPSPosition, alternatives: bool
    ) -> Dict[str, Any]:
        def interpolate(p1: GPSPosition, p2: GPSPosition, t: float) -> GPSPosition:
            return GPSPosition(
                latitude=p1.latitude + (p2.latitude - p1.latitude) * t,
                longitude=p1.longitude + (p2.longitude - p1.longitude) * t,
            )
        num_points = 8
        routes = []
        lat_span = destination.latitude - origin.latitude
        lng_span = destination.longitude - origin.longitude
        seed = int(hashlib.sha256(
            f"{origin.latitude:.5f},{origin.longitude:.5f},{destination.latitude:.5f},{destination.longitude:.5f}".encode()
        ).hexdigest()[:8], 16)

        for route_idx in range(3 if alternatives else 1):
            points = []
            # Create distinct geometry per route: offset + extra wiggle for many turns on route 0
            offset_scale = (route_idx - 1) * 0.018
            for i in range(num_points + 1):
                t = i / num_points
                base = interpolate(origin, destination, t)
                curve = math.sin(math.pi * t) * offset_scale
                # Route 0 (A) has extra zigzag to simulate many turns
                zigzag = 0
                if route_idx == 0:
                    zigzag = math.sin(t * math.pi * 6) * 0.002
                offset_lat = curve * max(abs(lat_span), 0.01) + zigzag
                offset_lng = curve * max(abs(lng_span), 0.01) + zigzag * 0.5
                points.append({
                    "lat": round(base.latitude + offset_lat, 6),
                    "lng": round(base.longitude + offset_lng, 6),
                })
            direct_dist = self._haversine_km(origin, destination)
            detour_factor = (1.02, 1.12, 1.28)[route_idx]
            dist_km = direct_dist * detour_factor
            # Spec-aligned: A fastest heavy traffic poor quality many turns, B medium low traffic excellent few turns, C longest moderate wide major
            traffic = (0.82, 0.15, 0.45)[route_idx]
            quality = (0.35, 0.92, 0.65)[route_idx]
            routes.append({
                "summary": f"Simulated Route {chr(65+route_idx)}",
                "distance_km": round(dist_km, 2),
                "duration_seconds": round((dist_km / (48 - route_idx * 7)) * 3600),
                "points": points,
                "is_simulated": True,
                "source": "mock",
                "_mock_traffic": traffic,
                "_mock_quality": quality,
                "_mock_width": (4.5, 6.0, 7.5)[route_idx],  # A narrow, C wide for fire
                "_mock_clearance": (5.5, 4.8, 5.8)[route_idx],
                "base_speed_kmh": (48, 41, 34)[route_idx],
                "is_highway": route_idx == 2,  # C is major road
            })
        return {"routes": routes, "source": "mock", "is_simulated": True, "status": "OK", "warning": "Simulated geometry - not real roads"}

    def _haversine_km(self, origin: GPSPosition, destination: GPSPosition) -> float:
        R = 6371
        dlat = math.radians(destination.latitude - origin.latitude)
        dlon = math.radians(destination.longitude - origin.longitude)
        a = (
            math.sin(dlat/2)**2
            + math.cos(math.radians(origin.latitude)) * math.cos(math.radians(destination.latitude)) * math.sin(dlon/2)**2
        )
        return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))

    async def health_check(self) -> Dict[str, Any]:
        return {"provider": self.name, "status": "up", "simulated": True}
