import redis.asyncio as aioredis
from app.core.config import settings
from functools import lru_cache

_pool: aioredis.Redis | None = None

def get_redis() -> aioredis.Redis:
    global _pool
    if _pool is None:
        _pool = aioredis.from_url(
            settings.redis_url,
            decode_responses=True,
            socket_connect_timeout=5,
        )
    return _pool

async def ping_redis() -> bool:
    try:
        return await get_redis().ping()
    except Exception:
        return False
