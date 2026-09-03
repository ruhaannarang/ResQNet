import httpx
from typing import Dict, Any
from ....models.schemas import GPSPosition
from ....core.config import get_settings
from .base import RoutingProvider, ProviderError, ProviderTimeoutError, ProviderNoRouteError, ProviderRateLimitError

settings = get_settings()


class OSRMRoutingProvider(RoutingProvider):
    name = "osrm"

    def __init__(self, base_url: str | None = None, timeout: float | None = None):
        self.base_url = (base_url or settings.OSRM_BASE_URL).rstrip("/")
        self.timeout = timeout or settings.ROUTING_TIMEOUT_SECONDS

    async def get_routes(
        self, origin: GPSPosition, destination: GPSPosition, alternatives: bool = True
    ) -> Dict[str, Any]:
        self._validate_coords(origin, destination)
        coordinates = f"{origin.longitude},{origin.latitude};{destination.longitude},{destination.latitude}"
        url = f"{self.base_url}/route/v1/driving/{coordinates}"
        params = {
            "alternatives": "true" if alternatives else "false",
            "steps": "false",
            "geometries": "geojson",
            "overview": "full",
        }
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                resp = await client.get(url, params=params)
        except httpx.TimeoutException as exc:
            raise ProviderTimeoutError(self.name, f"OSRM timeout after {self.timeout}s") from exc
        except httpx.HTTPError as exc:
            raise ProviderError(f"OSRM network error: {exc}", self.name) from exc

        if resp.status_code == 429:
            raise ProviderRateLimitError(self.name)
        if resp.status_code >= 400:
            raise ProviderError(f"OSRM HTTP {resp.status_code}: {resp.text[:500]}", self.name, status_code=502)

        try:
            data = resp.json()
        except Exception as exc:
            raise ProviderError(f"OSRM invalid JSON response", self.name) from exc

        code = data.get("code")
        if code != "Ok" or not data.get("routes"):
            msg = data.get("message") or f"OSRM routing failed: {code}"
            if code in ("NoRoute", "NoSegment"):
                raise ProviderNoRouteError(self.name, msg)
            raise ProviderNoRouteError(self.name, msg)

        return self._normalize(data)

    def _normalize(self, data: Dict[str, Any]) -> Dict[str, Any]:
        routes = []
        for idx, route in enumerate(data.get("routes", [])):
            coords = route.get("geometry", {}).get("coordinates", [])
            points = [{"lat": lat, "lng": lng} for lng, lat in coords]
            if len(points) < 2:
                continue
            distance_km = route.get("distance", 0) / 1000
            duration_s = route.get("duration", 0)
            base_speed = (distance_km / (duration_s / 3600)) if duration_s else 35
            routes.append({
                "summary": f"OSRM Route {chr(65+idx)}",
                "distance_km": distance_km,
                "duration_seconds": duration_s,
                "points": points,
                "is_simulated": False,
                "source": "osrm",
                # OSRM has no live traffic/width/clearance — deterministic per-class estimates so optimizer can compare alternatives
                "traffic_congestion": min(0.9, 0.10 + idx * 0.06),
                "road_quality": max(0.65, 0.90 - idx * 0.08),
                "base_speed_kmh": max(15, min(90, base_speed)),
                "road_width_meters": max(4.2, 7.0 - idx * 0.9),
                "bridge_clearance_meters": max(3.4, 5.5 - idx * 0.7),
                "is_highway": idx == 0,
                "raw_osrm": route,
            })
        return {"routes": routes, "source": "osrm", "is_simulated": False, "status": "OK"}

    async def health_check(self) -> Dict[str, Any]:
        # Light health check: try a short route
        try:
            # Use a known short hop (Bengaluru)
            from ....models.schemas import GPSPosition
            o = GPSPosition(latitude=12.9716, longitude=77.5946)
            d = GPSPosition(latitude=12.9866, longitude=77.6066)
            await self.get_routes(o, d, alternatives=False)
            return {"provider": self.name, "status": "up", "url": self.base_url}
        except Exception as e:
            return {"provider": self.name, "status": "down", "url": self.base_url, "error": str(e)}
