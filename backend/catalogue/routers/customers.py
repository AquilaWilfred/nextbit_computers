from __future__ import annotations

import asyncio
import json
from typing import Any

from fastapi import APIRouter, Depends, Query, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
from sqlalchemy import or_

from db.postgres import get_db
from db.redis import get_redis
from models.auth import User

router = APIRouter()

CUSTOMERS_WS_CHANNEL = "customers:updates"


# ── helpers ──────────────────────────────────────────────────────────────────

def _serialize(u: User) -> dict[str, Any]:
    return {
        "id":          str(u.id),
        "name":        u.name,
        "email":       u.email,
        "phone":       u.phone,
        "role":        u.role,
        "createdAt":   u.createdAt.isoformat() if u.createdAt else None,
        "lastSignedIn": u.lastSignedIn.isoformat() if u.lastSignedIn else None,
    }


# ── REST ─────────────────────────────────────────────────────────────────────

@router.get("")
async def list_customers(
    search: str | None = Query(None),
    db: Session = Depends(get_db),
):
    q = db.query(User)
    if search:
        term = f"%{search}%"
        q = q.filter(or_(User.name.ilike(term), User.email.ilike(term)))
    return [_serialize(u) for u in q.order_by(User.createdAt.desc()).all()]


# ── WebSocket ─────────────────────────────────────────────────────────────────

@router.websocket("/ws")
async def customers_ws(websocket: WebSocket):
    await websocket.accept()
    redis = get_redis()
    pubsub = redis.pubsub()
    await pubsub.subscribe(CUSTOMERS_WS_CHANNEL)

    async def ping_loop():
        while True:
            await asyncio.sleep(20)
            try:
                await websocket.send_text(json.dumps({"type": "ping"}))
            except Exception:
                return

    ping_task = asyncio.create_task(ping_loop())

    try:
        async for message in pubsub.listen():
            if message["type"] == "message":
                await websocket.send_text(message["data"])
    except WebSocketDisconnect:
        pass
    finally:
        ping_task.cancel()
        await pubsub.unsubscribe(CUSTOMERS_WS_CHANNEL)
        await pubsub.aclose()
