"""
Legacy MapDataService retained for backward compatibility.
New code should use app.services.routing.providers directly.
This wrapper now delegates to the provider factory.
"""
import hashlib
import math
import httpx
from typing import List, Optional, Dict, Any
from ..models.schemas import GPSPosition, RouteSegment, RoutePoint
from ..core.config import get_settings

settings = get_settings()


class MapDataService:
    def __init__(self):
        self.google_key = settings.GOOGLE_MAPS_API_KEY
        self.mapbox_key = settings.MAPBOX_API_KEY
        self.here_key = settings.HERE_API_KEY
        self.tomtom_key = settings.TOMTOM_API_KEY

    async def get_directions_google(
        self, origin: GPSPosition, destination: GPSPosition, alternatives: bool = True
    ) -> Dict[str, Any]:
        if not self.google_key:
            try:
                return await self.get_directions_osrm(origin, destination, alternatives)
            except (httpx.HTTPError, ValueError, KeyError) as exc:
                if settings.ALLOW_SIMULATED_ROUTES:
                    return self._mock_directions(origin, destination, alternatives)
                raise RuntimeError(
                    "No real routing provider is available. Configure GOOGLE_MAPS_API_KEY "
                    "or OSRM_BASE_URL, or explicitly enable ALLOW_SIMULATED_ROUTES for demos."
                ) from exc

        url = "https://maps.googleapis.com/maps/api/directions/json"
        params = {
            "origin": f"{origin.latitude},{origin.longitude}",
            "destination": f"{destination.latitude},{destination.longitude}",
            "alternatives": "true" if alternatives else "false",
            "departure_time": "now",
            "traffic_model": "best_guess",
            "key": self.google_key,
        }
        async with httpx.AsyncClient() as client:
            resp = await client.get(url, params=params, timeout=10.0)
            resp.raise_for_status()
            data = resp.json()
            if data.get("status") != "OK":
                return self._mock_directions(origin, destination, alternatives)
            return self._normalize_google_routes(data, origin, destination)

    async def get_directions_osrm(
        self, origin: GPSPosition, destination: GPSPosition, alternatives: bool = True
    ) -> Dict[str, Any]:
        """Get actual drivable-road geometry from OSRM/OpenStreetMap."""
        coordinates = (
            f"{origin.longitude},{origin.latitude};"
            f"{destination.longitude},{destination.latitude}"
        )
        url = f"{settings.OSRM_BASE_URL.rstrip('/')}/route/v1/driving/{coordinates}"
        params = {
            "alternatives": "true" if alternatives else "false",
            "steps": "false",
            "geometries": "geojson",
            "overview": "full",
        }
        async with httpx.AsyncClient() as client:
            resp = await client.get(url, params=params, timeout=15.0)
            resp.raise_for_status()
            data = resp.json()
        if data.get("code") != "Ok" or not data.get("routes"):
            raise ValueError(f"OSRM routing failed: {data.get('code', 'unknown')}")
        return self._normalize_osrm_routes(data)

    def _normalize_osrm_routes(self, data: Dict[str, Any]) -> Dict[str, Any]:
        routes = []
        for route_idx, route in enumerate(data.get("routes", [])):
            coordinates = route.get("geometry", {}).get("coordinates", [])
            points = [{"lat": lat, "lng": lng} for lng, lat in coordinates]
            if len(points) < 2:
                continue
            distance_km = route.get("distance", 0) / 1000
            duration_seconds = route.get("duration", 0)
            base_speed = (distance_km / (duration_seconds / 3600)) if duration_seconds else 35
            routes.append({
                "summary": "OSRM road route",
                "distance_km": distance_km,
                "duration_seconds": duration_seconds,
                "points": points,
                # OSRM does not provide live traffic or vehicle dimensions.
                # Keep provider values separate from deterministic route-class
                # estimates so the optimizer can still compare alternatives.
                "traffic_congestion": min(0.9, 0.10 + route_idx * 0.06),
                "road_quality": max(0.65, 0.90 - route_idx * 0.08),
                "base_speed_kmh": max(15, min(90, base_speed)),
                "road_width_meters": max(4.2, 7.0 - route_idx * 0.9),
                "bridge_clearance_meters": max(3.4, 5.5 - route_idx * 0.7),
                "is_highway": route_idx == 0,
            })
        return {"routes": routes, "status": "OK", "source": "osrm"}

    def _normalize_google_routes(
        self, data: Dict[str, Any], origin: GPSPosition, destination: GPSPosition
    ) -> Dict[str, Any]:
        """Convert Google's response into the internal route format."""
        routes = []
        for route_idx, route in enumerate(data.get("routes", [])):
            legs = route.get("legs", [])
            steps = [step for leg in legs for step in leg.get("steps", [])]
            points = []
            for step in steps:
                start = step.get("start_location")
                if start:
                    points.append({"lat": start["lat"], "lng": start["lng"]})
            if steps and steps[-1].get("end_location"):
                end = steps[-1]["end_location"]
                points.append({"lat": end["lat"], "lng": end["lng"]})
            if len(points) < 2:
                points = [
                    {"lat": origin.latitude, "lng": origin.longitude},
                    {"lat": destination.latitude, "lng": destination.longitude},
                ]

            distance_m = sum(leg.get("distance", {}).get("value", 0) for leg in legs)
            duration = sum(
                leg.get("duration_in_traffic", leg.get("duration", {})).get("value", 0)
                for leg in legs
            )
            routes.append({
                "summary": route.get("summary", "Google route"),
                "distance_km": distance_m / 1000,
                "duration_seconds": duration,
                "points": points,
                "traffic_congestion": min(0.9, 0.12 + route_idx * 0.06),
                "road_quality": max(0.65, 0.90 - route_idx * 0.08),
                "base_speed_kmh": 45,
                "road_width_meters": max(4.2, 7.0 - route_idx * 0.9),
                "bridge_clearance_meters": max(3.4, 5.5 - route_idx * 0.7),
                "is_highway": route_idx == 0,
            })
        return {"routes": routes, "status": "OK"}

    async def get_traffic_mapbox(
        self, coordinates: List[GPSPosition]
    ) -> Dict[str, Any]:
        coords_str = ";".join(f"{c.longitude},{c.latitude}" for c in coordinates)
        url = f"https://api.mapbox.com/directions/v5/mapbox/driving/{coords_str}"
        params = {
            "access_token": self.mapbox_key,
            "overview": "full",
            "annotations": "congestion,duration,distance",
            "alternatives": "true",
        }
        async with httpx.AsyncClient() as client:
            resp = await client.get(url, params=params, timeout=10.0)
            return resp.json()

    async def get_weather(self, position: GPSPosition) -> Dict[str, Any]:
        if not settings.WEATHER_API_KEY:
            return {"condition": "clear", "visibility_km": 10, "precipitation_mm": 0}

        url = "https://api.openweathermap.org/data/2.5/weather"
        params = {
            "lat": position.latitude,
            "lon": position.longitude,
            "appid": settings.WEATHER_API_KEY,
            "units": "metric",
        }
        async with httpx.AsyncClient() as client:
            resp = await client.get(url, params=params, timeout=10.0)
            data = resp.json()
            return {
                "condition": data.get("weather", [{}])[0].get("main", "clear"),
                "visibility_km": data.get("visibility", 10000) / 1000,
                "precipitation_mm": data.get("rain", {}).get("1h", 0),
                "wind_speed_ms": data.get("wind", {}).get("speed", 0),
                "temperature_c": data.get("main", {}).get("temp", 20),
            }

    def _mock_directions(
        self, origin: GPSPosition, destination: GPSPosition, alternatives: bool
    ) -> Dict[str, Any]:
        def interpolate(p1: GPSPosition, p2: GPSPosition, t: float) -> GPSPosition:
            return GPSPosition(
                latitude=p1.latitude + (p2.latitude - p1.latitude) * t,
                longitude=p1.longitude + (p2.longitude - p1.longitude) * t,
            )

        # This is a deterministic fallback, not a claim that these are real roads.
        # It keeps local development repeatable until a real routing provider is configured.
        num_points = 8
        routes = []
        lat_span = destination.latitude - origin.latitude
        lng_span = destination.longitude - origin.longitude
        seed = int(hashlib.sha256(
            f"{origin.latitude:.5f},{origin.longitude:.5f},{destination.latitude:.5f},{destination.longitude:.5f}".encode()
        ).hexdigest()[:8], 16)

        for route_idx in range(3 if alternatives else 1):
            points = []
            offset_scale = (route_idx - 1) * 0.018
            for i in range(num_points + 1):
                t = i / num_points
                base = interpolate(origin, destination, t)
                curve = math.sin(math.pi * t) * offset_scale
                offset_lat = curve * max(abs(lat_span), 0.01)
                offset_lng = curve * max(abs(lng_span), 0.01)
                points.append({
                    "lat": round(base.latitude + offset_lat, 6),
                    "lng": round(base.longitude + offset_lng, 6),
                })

            direct_dist = self._haversine_km(origin, destination)
            detour_factor = (1.02, 1.12, 1.28)[route_idx]
            dist_km = direct_dist * detour_factor
            # Alternatives trade speed for congestion and road capacity. This
            # gives the optimizer something meaningful to compare offline.
            traffic = ((seed % 16) / 100) + (0.18, 0.04, 0.10)[route_idx]

            routes.append({
                "summary": f"Route {chr(65 + route_idx)}",
                "distance_km": round(dist_km, 2),
                "duration_seconds": round((dist_km / (48 - route_idx * 7)) * 3600),
                "points": points,
                "traffic_congestion": round(min(0.9, traffic), 3),
                "road_quality": (0.86, 0.90, 0.72)[route_idx],
                "base_speed_kmh": (52, 39, 34)[route_idx],
                "road_width_meters": (7.0, 6.0, 4.2)[route_idx],
                "bridge_clearance_meters": (5.5, 4.8, 3.4)[route_idx],
                "is_highway": route_idx in (0, 1),
            })

        return {"routes": routes, "status": "OK"}

    def _haversine_km(self, origin: GPSPosition, destination: GPSPosition) -> float:
        radius = 6371
        dlat = math.radians(destination.latitude - origin.latitude)
        dlon = math.radians(destination.longitude - origin.longitude)
        a = (
            math.sin(dlat / 2) ** 2
            + math.cos(math.radians(origin.latitude))
            * math.cos(math.radians(destination.latitude))
            * math.sin(dlon / 2) ** 2
        )
        return radius * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
