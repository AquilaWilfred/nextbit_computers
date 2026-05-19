from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import List, Optional
from sqlalchemy.orm import Session
from db.postgres import get_db
from db.redis import get_redis
from models.product import Category
import json

router = APIRouter()

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
    try:
        r = get_redis()
        cached = await r.get("catalogue:categories")
        if cached:
            return json.loads(cached)
    except Exception:
        pass
    categories = db.query(Category).all()
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
    try:
        r = get_redis()
        await r.setex("catalogue:categories", 300, json.dumps(result))
    except Exception:
        pass
    return result
