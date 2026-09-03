import httpx
from typing import Dict, Any
from ....models.schemas import GPSPosition
from ....core.config import get_settings
from .base import RoutingProvider, ProviderError, ProviderTimeoutError, ProviderNoRouteError, ProviderRateLimitError

settings = get_settings()


class GoogleRoutingProvider(RoutingProvider):
    name = "google"

    def __init__(self, api_key: str | None = None, timeout: float | None = None):
        self.api_key = api_key if api_key is not None else settings.GOOGLE_MAPS_API_KEY
        self.timeout = timeout or 10.0

    async def get_routes(
        self, origin: GPSPosition, destination: GPSPosition, alternatives: bool = True
    ) -> Dict[str, Any]:
        self._validate_coords(origin, destination)
        if not self.api_key:
            raise ProviderError("Google Maps API key not configured", self.name, status_code=503)

        url = "https://maps.googleapis.com/maps/api/directions/json"
        params = {
            "origin": f"{origin.latitude},{origin.longitude}",
            "destination": f"{destination.latitude},{destination.longitude}",
            "alternatives": "true" if alternatives else "false",
            "departure_time": "now",
            "traffic_model": "best_guess",
            "key": self.api_key,
        }
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                resp = await client.get(url, params=params)
        except httpx.TimeoutException as exc:
            raise ProviderTimeoutError(self.name, f"Google timeout after {self.timeout}s") from exc
        except httpx.HTTPError as exc:
            raise ProviderError(f"Google network error: {exc}", self.name) from exc

        if resp.status_code == 429:
            raise ProviderRateLimitError(self.name, "Google rate limit")
        resp.raise_for_status()
        data = resp.json()
        status = data.get("status")
        if status == "ZERO_RESULTS":
            raise ProviderNoRouteError(self.name, "Google: ZERO_RESULTS - No route found")
        if status == "OVER_QUERY_LIMIT":
            raise ProviderRateLimitError(self.name, f"Google: {status}")
        if status == "REQUEST_DENIED":
            raise ProviderError(f"Google: REQUEST_DENIED - {data.get('error_message','invalid key/permissions')}", self.name, status_code=403)
        if status != "OK":
            raise ProviderError(f"Google routing failed: {status} - {data.get('error_message','')}", self.name)

        return self._normalize(data, origin, destination)

    def _normalize(self, data: Dict[str, Any], origin: GPSPosition, destination: GPSPosition) -> Dict[str, Any]:
        routes = []
        for idx, route in enumerate(data.get("routes", [])):
            legs = route.get("legs", [])
            steps = [s for leg in legs for s in leg.get("steps", [])]
            points = []
            for step in steps:
                st = step.get("start_location")
                if st:
                    points.append({"lat": st["lat"], "lng": st["lng"]})
            if steps and steps[-1].get("end_location"):
                end = steps[-1]["end_location"]
                points.append({"lat": end["lat"], "lng": end["lng"]})
            if len(points) < 2:
                points = [
                    {"lat": origin.latitude, "lng": origin.longitude},
                    {"lat": destination.latitude, "lng": destination.longitude},
                ]
            dist_m = sum(leg.get("distance", {}).get("value", 0) for leg in legs)
            dur_s = sum(leg.get("duration_in_traffic", leg.get("duration", {})).get("value", 0) for leg in legs)
            routes.append({
                "summary": route.get("summary", f"Google Route {chr(65+idx)}"),
                "distance_km": dist_m / 1000,
                "duration_seconds": dur_s,
                "points": points,
                "is_simulated": False,
                "source": "google",
                "has_live_traffic": True,
                "raw_google": route,
            })
        return {"routes": routes, "source": "google", "is_simulated": False, "status": "OK"}

    async def health_check(self) -> Dict[str, Any]:
        if not self.api_key:
            return {"provider": self.name, "status": "not_configured", "reason": "GOOGLE_MAPS_API_KEY not set"}
        # Can't hit Google without cost, just report configured
        return {"provider": self.name, "status": "configured", "has_key": True}
