from fastapi import APIRouter, Request
from typing import List, Optional

router = APIRouter()

SETTINGS = {
    "general": {
        "storeName": "NEXTBIT",
        "storeDescription": "Your premier destination for cutting-edge computers, laptops, and accessories.",
        "heroTitle": "Premium Tech,\nExceptional Performance",
        "heroDescription": "Discover the latest laptops, desktops, and accessories from the world's leading brands.",
        "heroBadge": "New Arrivals 2025",
        "ctaTitle": "Ready to Upgrade Your Setup?",
        "ctaDescription": "Join thousands of satisfied customers. Shop the latest tech with confidence.",
        "address": "Nairobi, Kenya",
        "phone": "+254 724 704 865",
        "contactEmail": "support@nextbit.co.ke",
        "statsProductCount": 500,
        "statsCustomerCount": 2000,
        "statsAvgRating": "4.9",
        "openingHours": [
            {"label": "Mon - Fri", "value": "9:00 AM - 8:00 PM"},
            {"label": "Saturday", "value": "10:00 AM - 6:00 PM"},
            {"label": "Sunday", "value": "Closed"},
        ],
    },
    "appearance": {
        "theme": "light",
        "logoUrl": None,
        "footerAdText": "AI-powered product recommendations tailored to your next order.",
    },
    "social": {
        "facebook": "https://facebook.com/nextbit",
        "instagram": None,
        "twitter": None,
        "youtube": None,
        "linkedin": None,
        "tiktok": None,
    },
    "shipping": {
        "freeShippingThreshold": 50000,
    },

    "payment": {
        "mpesaEnabled": True,
        "mpesaConsumerKey": "",
        "mpesaConsumerSecret": "",
        "mpesaShortcode": "",
        "mpesaPasskey": "",
        "paypalEnabled": False,
        "paypalClientId": "",
        "stripeEnabled": False,
        "stripePublishableKey": "",
    },
    "email": {
        "smtpHost": "",
        "smtpPort": 587,
        "smtpUser": "",
        "smtpPassword": "",
        "fromAddress": "support@nextbit.co.ke",
        "fromName": "NEXTBIT",
    },
    "security": {
        "twoFactorEnabled": False,
        "sessionTimeoutMinutes": 60,
        "maxLoginAttempts": 5,
        "requireEmailVerification": True,
    },
    "backup": {
        "autoBackupEnabled": False,
        "frequency": "daily",
        "retentionDays": 30,
        "lastBackupAt": None,
    },
    "brands": ["Samsung", "Dell", "HP", "Lenovo", "Asus", "Apple", "Acer"],
}

@router.get("/public")
async def get_public_settings(request: Request):
    raw = request.query_params.get("keys", "")
    multi = request.query_params.getlist("keys")
    keys = []
    if raw:
        for k in raw.split(","):
            k = k.strip()
            if k:
                keys.append(k)
    if multi and len(multi) > 1:
        keys = multi

    cache_key = "catalogue:settings:public:" + (",".join(sorted(keys)) if keys else "all")
    try:
        from db.redis import get_redis
        import json
        r = get_redis()
        cached = await r.get(cache_key)
        if cached:
            return json.loads(cached)
    except Exception:
        r = None

    result = {key: SETTINGS[key] for key in keys if key in SETTINGS} if keys else dict(SETTINGS)
    try:
        if r:
            await r.setex(cache_key, 300, json.dumps(result))
    except Exception:
        pass
    return result


@router.get("/{key}")
async def get_setting(key: str):
    if key not in SETTINGS:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail=f"Setting '{key}' not found")
    return {"key": key, "value": SETTINGS[key]}


@router.put("/{key}")
async def update_setting(key: str, payload: dict):
    import json
    value = payload.get("value", payload)
    if key in SETTINGS:
        if isinstance(SETTINGS[key], dict):
            SETTINGS[key].update(value)
        else:
            SETTINGS[key] = value
    else:
        SETTINGS[key] = value

    # Publish to Redis so WebSocket clients sync in real time
    try:
        from db.redis import get_redis
        r = get_redis()
        msg = json.dumps({"type": "settings_updated", "key": key, "value": SETTINGS[key]})
        await r.publish("settings:updates", msg)
    except Exception:
        pass

    return {"key": key, "value": SETTINGS[key]}



# ── WebSocket: real-time settings sync ───────────────────────────────────────
import json
import asyncio
from fastapi import WebSocket, WebSocketDisconnect

SETTINGS_CHANNEL = "settings:updates"


@router.websocket("/ws")
async def settings_ws(websocket: WebSocket):
    await websocket.accept()

    async def ping_loop():
        """Send pings so the browser knows we are alive."""
        try:
            while True:
                await asyncio.sleep(20)
                await websocket.send_text(json.dumps({"type": "ping"}))
        except Exception:
            pass

    try:
        from db.redis import get_redis
        r = get_redis()
        pubsub = r.pubsub()
        await pubsub.subscribe(SETTINGS_CHANNEL)

        ping_task = asyncio.create_task(ping_loop())
        try:
            # redis.asyncio pubsub: call get_message in a loop with a short sleep
            while True:
                message = await pubsub.get_message(
                    ignore_subscribe_messages=True, timeout=1.0
                )
                if message is not None:
                    data = message.get("data", "")
                    if isinstance(data, bytes):
                        data = data.decode()
                    await websocket.send_text(data)
                else:
                    await asyncio.sleep(0.1)
        finally:
            ping_task.cancel()
            await pubsub.unsubscribe(SETTINGS_CHANNEL)
            await pubsub.aclose()

    except WebSocketDisconnect:
        pass
    except Exception:
        # Redis unavailable — ping-only fallback
        try:
            while True:
                await websocket.send_text(json.dumps({"type": "ping"}))
                await asyncio.sleep(20)
        except WebSocketDisconnect:
            pass
