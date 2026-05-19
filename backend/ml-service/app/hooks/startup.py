from app.core.logging import logger, setup_logging
from app.db.mongo import get_mongo_client
from app.db.redis import get_redis

async def on_startup():
    setup_logging()
    logger.info("NextBit ML Service starting...")

    # Warm up MongoDB connection
    try:
        client = get_mongo_client()
        await client.admin.command("ping")
        logger.info("MongoDB connected")
    except Exception as e:
        logger.error(f"MongoDB connection failed: {e}")

    # Warm up Redis connection
    try:
        redis = await get_redis()
        await redis.ping()
        logger.info("Redis connected")
    except Exception as e:
        logger.error(f"Redis connection failed: {e}")

    logger.info("All connections ready")
