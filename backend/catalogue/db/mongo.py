from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings

_client: AsyncIOMotorClient | None = None

def get_mongo_client() -> AsyncIOMotorClient:
    global _client
    if _client is None:
        _client = AsyncIOMotorClient(
            settings.mongo_url,
            serverSelectionTimeoutMS=5000,
        )
    return _client

def get_mongo_db():
    return get_mongo_client()["nextbit"]

async def ping_mongo() -> bool:
    try:
        await get_mongo_client().admin.command("ping")
        return True
    except Exception:
        return False