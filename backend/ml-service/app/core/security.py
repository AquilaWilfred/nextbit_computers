from fastapi import HTTPException, Security, status
from fastapi.security.api_key import APIKeyHeader
from app.core.config import settings

api_key_header = APIKeyHeader(name="X-Internal-Key", auto_error=False)

async def verify_internal_key(api_key: str = Security(api_key_header)):
    if api_key != settings.internal_api_key:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid internal API key — only Axum gateway is allowed",
        )
    return api_key
