from fastapi import APIRouter, HTTPException
from typing import List
from ..models.schemas import (
    EmergencyRequest, OptimizedRouteResult, GPSUpdate, RerouteResponse
)
from ..services.routing_service import RoutingService

router = APIRouter(prefix="/api/v1", tags=["routing"])
routing_service = RoutingService()


@router.post("/emergency/route", response_model=OptimizedRouteResult)
async def compute_optimal_route(request: EmergencyRequest):
    try:
        result = await routing_service.process_emergency(request)
        return result
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Routing failed: {str(e)}")


@router.post("/emergency/reroute", response_model=RerouteResponse)
async def evaluate_reroute(update: GPSUpdate):
    try:
        result = await routing_service.evaluate_reroute(update)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Reroute evaluation failed: {str(e)}")


@router.get("/emergency/health")
async def health_check():
    return {"status": "healthy", "service": "ResQNet Routing API"}
