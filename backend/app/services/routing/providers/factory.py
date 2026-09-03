from typing import Dict, Any
from ....core.config import get_settings
from ....models.schemas import GPSPosition
from .base import RoutingProvider, ProviderError
from .osrm import OSRMRoutingProvider
from .google import GoogleRoutingProvider
from .mock import MockRoutingProvider

settings = get_settings()

def _provider_from_name(name: str) -> RoutingProvider:
    name = (name or "auto").lower()
    if name == "osrm":
        return OSRMRoutingProvider()
    if name == "google":
        return GoogleRoutingProvider()
    if name == "mock":
        return MockRoutingProvider()
    # auto
    # priority: google if key present else osrm (if reachable) else mock if allowed
    if settings.GOOGLE_MAPS_API_KEY:
        return GoogleRoutingProvider()
    return OSRMRoutingProvider()

def get_routing_provider(name: str | None = None) -> RoutingProvider:
    configured = name or settings.ROUTING_PROVIDER
    return _provider_from_name(configured)

async def get_routes_with_fallback(
    origin: GPSPosition, destination: GPSPosition, alternatives: bool = True, preferred: str | None = None
) -> Dict[str, Any]:
    """
    Try preferred provider, then fallback chain:
    preferred -> osrm -> mock (only if ALLOW_SIMULATED_ROUTES)
    Never silently fall back to mock in production without explicit flag.
    """
    providers_to_try = []
    primary = get_routing_provider(preferred)
    providers_to_try.append(primary)

    # Add fallback if primary is not osrm
    if primary.name != "osrm":
        providers_to_try.append(OSRMRoutingProvider())

    # Mock only if explicitly allowed
    allow_mock = settings.ALLOW_SIMULATED_ROUTES

    last_error: Exception | None = None
    for provider in providers_to_try:
        try:
            result = await provider.get_routes(origin, destination, alternatives=alternatives)
            if result.get("routes"):
                return result
        except Exception as e:
            last_error = e
            continue

    if allow_mock:
        mock = MockRoutingProvider()
        try:
            return await mock.get_routes(origin, destination, alternatives=alternatives)
        except Exception as e:
            last_error = e

    # No provider succeeded
    if last_error:
        # Re-raise with context
        if isinstance(last_error, ProviderError):
            raise last_error
        raise ProviderError(str(last_error), "all", status_code=502) from last_error
    raise ProviderError("No routing provider available and simulated routes not allowed. Set ALLOW_SIMULATED_ROUTES=true for demo mode or configure OSRM/Google.", "all", status_code=503)

async def get_available_providers() -> Dict[str, Any]:
    providers = {
        "osrm": OSRMRoutingProvider(),
        "google": GoogleRoutingProvider(),
        "mock": MockRoutingProvider(),
    }
    statuses = {}
    for name, prov in providers.items():
        try:
            statuses[name] = await prov.health_check()
        except Exception as e:
            statuses[name] = {"provider": name, "status": "error", "error": str(e)}
    # Add config insight
    statuses["_config"] = {
        "ROUTING_PROVIDER": settings.ROUTING_PROVIDER,
        "OSRM_BASE_URL": settings.OSRM_BASE_URL,
        "ALLOW_SIMULATED_ROUTES": settings.ALLOW_SIMULATED_ROUTES,
        "GOOGLE_CONFIGURED": bool(settings.GOOGLE_MAPS_API_KEY),
    }
    return statuses
