from fastapi import APIRouter, Depends
from db.redis import get_redis
from db.postgres import get_db
from sqlalchemy.orm import Session
from sqlalchemy import text
import json

router = APIRouter()

def _get_manager():
    # Late import avoids circular import — app is the top-level module
    from app.main import announcements
    return announcements

@router.get("/announcements")
async def get_announcements(db: Session = Depends(get_db)):
    try:
        r = get_redis()
        cached = await r.get("catalogue:announcements")
        if cached:
            return json.loads(cached)
    except Exception:
        pass

    rows = db.execute(text(
        'SELECT id, title, content, image, "linkUrl", active FROM announcements WHERE active = true ORDER BY id DESC'
    )).mappings().fetchall()
    result = [dict(r) for r in rows] if rows else [
        {"id": 1, "active": True, "title": "Welcome to NEXTBIT", "content": "Your e-commerce platform is live!"}
    ]

    try:
        r = get_redis()
        await r.setex("catalogue:announcements", 300, json.dumps(result))
    except Exception:
        pass

    # Broadcast to any connected WS clients so they stay in sync
    try:
        manager = _get_manager()
        await manager.broadcast(json.dumps({"type": "announcements", "data": result}))
    except Exception:
        pass

    return result

@router.get("/banners")
async def get_banners(db: Session = Depends(get_db)):
    rows = db.execute(text(
        'SELECT id, title, description, image, active, "order" FROM banners WHERE active = true ORDER BY "order" ASC'
    )).mappings().fetchall()
    return [dict(r) for r in rows]

@router.get("/promotions")
async def get_promotions(db: Session = Depends(get_db)):
    rows = db.execute(text(
        'SELECT id, title, description FROM promotions WHERE active = true ORDER BY id ASC'
    )).mappings().fetchall()
    return [dict(r) for r in rows]
