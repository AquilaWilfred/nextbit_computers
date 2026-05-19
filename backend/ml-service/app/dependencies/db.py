from app.db.postgres import get_postgres_session
from app.db.mongo import get_mongo_db
from app.db.redis import get_redis

# Re-export for use in routes via Depends()
__all__ = ["get_postgres_session", "get_mongo_db", "get_redis"]
