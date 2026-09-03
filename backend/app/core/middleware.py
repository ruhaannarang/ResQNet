import uuid
import time
import logging
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

logger = logging.getLogger("resqnet")

class RequestIDMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        request_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())[:8]
        request.state.request_id = request_id
        start = time.time()
        try:
            response: Response = await call_next(request)
        except Exception as exc:
            logger.exception(f"[{request_id}] Unhandled error on {request.url.path}: {exc}")
            return JSONResponse(
                status_code=500,
                content={"error": "Internal server error", "request_id": request_id, "detail": str(exc)},
            )
        duration_ms = (time.time() - start) * 1000
        response.headers["X-Request-ID"] = request_id
        response.headers["X-Response-Time-ms"] = f"{duration_ms:.1f}"
        # Simple structured log
        logger.info(f"[{request_id}] {request.method} {request.url.path} -> {response.status_code} in {duration_ms:.1f}ms")
        return response

class ErrorHandlingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        try:
            return await call_next(request)
        except Exception as e:
            # Already handled by RequestIDMiddleware, but keep as fallback
            request_id = getattr(request.state, "request_id", "unknown")
            return JSONResponse(
                status_code=500,
                content={"error": "Internal error", "request_id": request_id, "detail": str(e)},
            )
