from app.core.logging import logger
from app.db.mongo import close_mongo
from app.db.redis import close_redis

async def on_shutdown():
    logger.info("NextBit ML Service shutting down...")
    await close_mongo()
    await close_redis()
    logger.info("All connections closed cleanly")
