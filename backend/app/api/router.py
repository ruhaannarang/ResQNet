from fastapi import APIRouter
from ..api.routing import router as routing_router

api_router = APIRouter()
api_router.include_router(routing_router)
