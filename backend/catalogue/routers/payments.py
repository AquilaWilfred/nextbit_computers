from __future__ import annotations
import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from db.postgres import get_db
from db.redis import get_redis

async def cache_get(key: str):
    try:
        r = get_redis()
        val = await r.get(key)
        return json.loads(val) if val else None
    except Exception:
        return None

async def cache_set(key: str, value, ttl: int = 60):
    try:
        r = get_redis()
        await r.setex(key, ttl, json.dumps(value))
    except Exception:
        pass

async def cache_del(*keys: str):
    try:
        r = get_redis()
        for key in keys:
            await r.delete(key)
    except Exception:
        pass

router = APIRouter()


def _serialize_payment(row) -> dict:
    return {
        "id":        row.id,
        "orderId":   row.orderId,
        "method":    row.method,
        "amount":    float(row.amount),
        "status":    row.status,
        "createdAt": row.createdAt.isoformat() if row.createdAt else None,
    }


def _serialize_payout(row) -> dict:
    return {
        "id":           row.id,
        "agentId":      row.agent_id,
        "amount":       str(row.amount),
        "status":       row.status,
        "requestedAt":  row.requested_at.isoformat() if row.requested_at else None,
        "processedAt":  row.processed_at.isoformat() if row.processed_at else None,
        "transactionId": row.transaction_id,
    }


# ── Payments ──────────────────────────────────────────────────────────────────

@router.get("")
async def list_payments(db: Session = Depends(get_db)):
    cached = await cache_get("admin:payments")
    if cached:
        return cached
    rows = db.execute(text(
        'SELECT id, "orderId", method::text, amount, status::text, "createdAt" '
        'FROM payments ORDER BY "createdAt" DESC'
    )).fetchall()
    result = [_serialize_payment(r) for r in rows]
    await cache_set("admin:payments", result, ttl=60)
    return result


@router.get("/stats")
async def payment_stats(db: Session = Depends(get_db)):
    total_payouts = db.execute(text(
        "SELECT COALESCE(SUM(amount), 0) FROM delivery_payouts WHERE status = 'completed'"
    )).scalar()
    return {"totalPayouts": float(total_payouts)}


# ── Payout requests ───────────────────────────────────────────────────────────

@router.get("/payout-requests")
async def list_payout_requests(db: Session = Depends(get_db)):
    cached = await cache_get("admin:payout-requests")
    if cached:
        return cached
    rows = db.execute(text(
        "SELECT id, agent_id, amount, status::text, requested_at, processed_at, transaction_id "
        "FROM delivery_payouts ORDER BY requested_at DESC"
    )).fetchall()
    result = [_serialize_payout(r) for r in rows]
    await cache_set("admin:payout-requests", result, ttl=60)
    return result


@router.post("/payout-requests/{payout_id}/approve")
async def approve_payout(payout_id: int, db: Session = Depends(get_db)):
    result = db.execute(text(
        "UPDATE delivery_payouts SET status = 'completed', processed_at = NOW() "
        "WHERE id = :id AND status = 'pending' RETURNING id"
    ), {"id": payout_id})
    db.commit()
    if not result.fetchone():
        raise HTTPException(404, "Payout not found or already processed")
    await cache_del("admin:payout-requests")
    return {"success": True}


@router.post("/payout-requests/{payout_id}/reject")
async def reject_payout(payout_id: int, db: Session = Depends(get_db)):
    result = db.execute(text(
        "UPDATE delivery_payouts SET status = 'failed', processed_at = NOW() "
        "WHERE id = :id AND status = 'pending' RETURNING id"
    ), {"id": payout_id})
    db.commit()
    if not result.fetchone():
        raise HTTPException(404, "Payout not found or already processed")
    await cache_del("admin:payout-requests")
    return {"success": True}


# ── Stats WebSocket ───────────────────────────────────────────────────────────
import asyncio, json
from fastapi import WebSocket, WebSocketDisconnect

STATS_WS_CHANNEL = "admin:stats:updates"

@router.websocket("/ws/admin/stats")
async def stats_ws(websocket: WebSocket):
    from db.redis import get_redis
    await websocket.accept()
    redis = get_redis()
    pubsub = redis.pubsub()
    await pubsub.subscribe(STATS_WS_CHANNEL)

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
        await pubsub.unsubscribe(STATS_WS_CHANNEL)
        await pubsub.aclose()
