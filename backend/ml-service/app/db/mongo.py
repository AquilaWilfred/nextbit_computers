import certifi
from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings

_client: AsyncIOMotorClient | None = None

def get_mongo_client() -> AsyncIOMotorClient:
    global _client
    if _client is None:
        _client = AsyncIOMotorClient(
            settings.mongo_url,
            tlsCAFile=certifi.where(),
            serverSelectionTimeoutMS=20000,
        )
    return _client

def get_mongo_db():
    return get_mongo_client()["nextbit"]

async def close_mongo():
    global _client
    if _client:
        _client.close()
        _client = None