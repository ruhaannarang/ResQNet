from abc import ABC, abstractmethod
from typing import Dict, Any
from ....models.schemas import GPSPosition


class ProviderError(Exception):
    """Base for provider failures."""
    def __init__(self, message: str, provider: str, status_code: int = 502):
        super().__init__(message)
        self.provider = provider
        self.status_code = status_code


class ProviderTimeoutError(ProviderError):
    def __init__(self, provider: str, detail: str = "Routing provider timed out"):
        super().__init__(detail, provider, status_code=504)


class ProviderNoRouteError(ProviderError):
    def __init__(self, provider: str, detail: str = "No route found"):
        super().__init__(detail, provider, status_code=404)


class ProviderRateLimitError(ProviderError):
    def __init__(self, provider: str, detail: str = "Rate limit exceeded"):
        super().__init__(detail, provider, status_code=429)


class RoutingProvider(ABC):
    """Abstract routing provider."""
    name: str = "base"

    @abstractmethod
    async def get_routes(
        self, origin: GPSPosition, destination: GPSPosition, alternatives: bool = True
    ) -> Dict[str, Any]:
        """
        Returns normalized dict:
        {
          "routes": [ {summary, distance_km, duration_seconds, points: [{lat,lng}], raw? } ],
          "source": str,  # provider name
          "is_simulated": bool
        }
        """
        raise NotImplementedError

    async def health_check(self) -> Dict[str, Any]:
        return {"provider": self.name, "status": "unknown"}

    def _validate_coords(self, origin: GPSPosition, destination: GPSPosition):
        for label, pos in [("origin", origin), ("destination", destination)]:
            if pos.latitude is None or pos.longitude is None:
                raise ValueError(f"Invalid {label} coordinates: missing lat/lng")
            if not (-90 <= pos.latitude <= 90 and -180 <= pos.longitude <= 180):
                raise ValueError(f"Invalid {label} coordinates: out of range")
        # Zero-island check (common default mistake)
        if origin.latitude == 0 and origin.longitude == 0:
            raise ValueError("Origin is at 0,0 — likely unset coordinates")
        if destination.latitude == 0 and destination.longitude == 0:
            raise ValueError("Destination is at 0,0 — likely unset coordinates")
        # Same point
        if abs(origin.latitude - destination.latitude) < 1e-6 and abs(origin.longitude - destination.longitude) < 1e-6:
            raise ValueError("Origin and destination are identical")
