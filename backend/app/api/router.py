from fastapi import APIRouter
from ..api.routing import router as routing_router
from ..api.community import router as community_router
from ..api.bookings import router as bookings_router

api_router = APIRouter()
api_router.include_router(routing_router)
api_router.include_router(community_router)
api_router.include_router(bookings_router)
