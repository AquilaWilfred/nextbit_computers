from fastapi import Request, HTTPException, status
from app.core.config import settings

EXCLUDED_PATHS = ["/health", "/docs", "/redoc", "/openapi.json"]

async def auth_middleware(request: Request, call_next):
    if request.url.path in EXCLUDED_PATHS:
        return await call_next(request)

    api_key = request.headers.get("X-Internal-Key")
    if api_key != settings.internal_api_key:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Unauthorized — only Axum gateway may call this service",
        )
    return await call_next(request)
