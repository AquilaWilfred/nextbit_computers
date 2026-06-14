from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import List, Optional
from sqlalchemy.orm import Session
from db.postgres import get_db
from db.redis import get_redis
from models.product import Category
import json

router = APIRouter()

# In-process cache to avoid Redis round-trip on every request
_categories_cache: list | None = None
_categories_cache_ts: float = 0
CACHE_TTL = 300  # 5 minutes

class CategoryResponse(BaseModel):
    id: int
    name: str
    slug: str
    description: Optional[str] = ""
    featured: Optional[bool] = False
    active: Optional[bool] = True
    icon: Optional[str] = None
    imageUrl: Optional[str] = None
    parentId: Optional[int] = None
    order: Optional[int] = 0

@router.get("", response_model=List[CategoryResponse])
@router.get("/", response_model=List[CategoryResponse])
async def list_categories(db: Session = Depends(get_db)):
    import time
    global _categories_cache, _categories_cache_ts

    # 1. In-memory cache (fastest — no network)
    if _categories_cache is not None and (time.time() - _categories_cache_ts) < CACHE_TTL:
        return _categories_cache

    # 2. Redis cache (fast — shared across workers)
    try:
        r = get_redis()
        cached = await r.get("catalogue:categories")
        if cached:
            _categories_cache = json.loads(cached)
            _categories_cache_ts = time.time()
            return _categories_cache
    except Exception:
        pass

    # 3. Database (slowest — only on cold start or cache miss)
    categories = db.query(Category).filter(Category.active != False).order_by(Category.order).all()
    result = [
        {
            "id": c.id, "name": c.name, "slug": c.slug,
            "description": c.description or "",
            "featured": c.featured, "active": c.active,
            "icon": c.icon, "imageUrl": c.imageUrl,
            "parentId": c.parentId, "order": c.order,
        }
        for c in categories
    ]

    # Store in both caches
    _categories_cache = result
    _categories_cache_ts = time.time()
    try:
        r = get_redis()
        await r.setex("catalogue:categories", 300, json.dumps(result))
    except Exception:
        pass

    return result
