from fastapi import APIRouter, HTTPException, Request, Header
from typing import List, Optional
from ..models.schemas import (
    EmergencyRequest, OptimizedRouteResult, GPSUpdate, RerouteResponse, GPSPosition
)
from ..services.routing_service import RoutingService
from ..services.routing.providers.factory import get_available_providers, get_routes_with_fallback
from ..services.routing.providers.base import ProviderError
from ..models.enums import EmergencyCategory
from pydantic import BaseModel

router = APIRouter(prefix="/api/v1", tags=["routing"])
routing_service = RoutingService()

class RerouteWithContext(BaseModel):
    gps_update: GPSUpdate
    current_route_id: Optional[str] = None
    destination: Optional[GPSPosition] = None


@router.post("/emergency/route", response_model=OptimizedRouteResult)
async def compute_optimal_route(request: EmergencyRequest, http_request: Request):
    try:
        result = await routing_service.process_emergency(request)
        return result
    except ProviderError as e:
        raise HTTPException(status_code=e.status_code, detail={"error": str(e), "provider": e.provider, "request_id": http_request.headers.get("X-Request-ID")})
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Routing failed: {str(e)}")


# New canonical endpoint per spec
@router.post("/routes/optimize", response_model=OptimizedRouteResult)
async def optimize_routes(request: EmergencyRequest, http_request: Request):
    # Alias to emergency/route with same logic, but canonical
    try:
        result = await routing_service.process_emergency(request)
        return result
    except ProviderError as e:
        raise HTTPException(status_code=e.status_code, detail={"error": str(e), "provider": e.provider})
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Routing failed: {str(e)}")


@router.post("/emergency/reroute", response_model=RerouteResponse)
async def evaluate_reroute(update: GPSUpdate, current_route: Optional[dict] = None):
    try:
        # Support legacy call without current_route (returns stub)
        from ..models.schemas import CandidateRoute
        route_obj = None
        if current_route:
            try:
                route_obj = CandidateRoute(**current_route)
            except Exception:
                route_obj = None
        result = await routing_service.evaluate_reroute(update, current_route=route_obj)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Reroute evaluation failed: {str(e)}")


@router.post("/routes/evaluate-reroute", response_model=RerouteResponse)
async def evaluate_reroute_new(payload: dict):
    # Supports GPS update with optional route context; more robust
    try:
        gps_data = payload.get("gps_update") or payload
        gps = GPSUpdate(**gps_data) if "position" in gps_data else GPSUpdate(**payload)
        # Try to parse current_route if present
        from ..models.schemas import CandidateRoute
        cur = payload.get("current_route")
        route_obj = CandidateRoute(**cur) if cur else None
        result = await routing_service.evaluate_reroute(gps, current_route=route_obj)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Reroute evaluation failed: {str(e)}")


@router.get("/emergency/health")
async def health_check_legacy():
    return {"status": "healthy", "service": "ResQNet Routing API"}

@router.get("/health")
async def health_check():
    return {"status": "healthy", "service": "ResQNet Routing API", "version": "1.0.0"}

@router.get("/providers/status")
async def providers_status():
    statuses = await get_available_providers()
    return statuses
