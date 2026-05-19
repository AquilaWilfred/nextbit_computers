from __future__ import annotations
import json
from fastapi import APIRouter, HTTPException, Depends, Request
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List, Optional
from db.postgres import get_db
from db.redis import get_redis
from copy import deepcopy
from pydantic import BaseModel
from models.product import Category as CategoryModel
import re as _re

router = APIRouter()

ADMIN_SETTINGS: dict = {
    "general": {
        "storeName": "NEXTBIT",
        "storeDescription": "Your premier destination for cutting-edge computers, laptops, and accessories.",
        "contactEmail": "support@nextbit.co.ke",
        "phone": "+254 724 704 865",
        "address": "Nairobi, Kenya",
        "currency": "KES",
        "timezone": "Africa/Nairobi",
    },
    "appearance": {"theme": "light", "logoUrl": None, "footerAdText": "AI-powered product recommendations tailored to your next order."},
    "payment": {"mpesaEnv": "sandbox", "codEnabled": True},
    "shipping": {"freeShippingThreshold": 50000},
    "email": {},
    "security": {},
    "social": {"facebook": "https://facebook.com/nextbit", "instagram": None, "twitter": None, "youtube": None, "linkedin": None, "tiktok": None},
    "backup": {"schedule": "weekly"},
    "brands": ["Samsung", "Dell", "HP", "Lenovo", "Asus", "Apple", "Acer"],
    "payment_methods": {"mpesa": True, "paypal": True, "stripe": True, "bank_transfer": False, "cash_on_delivery": True},
    "mpesa_b2c": {"consumerKey": "", "consumerSecret": "", "shortcode": "", "initiatorName": "", "initiatorPassword": "", "certContent": "", "apiHost": "sandbox"},
    "ai": {"model": "gpt-4o-mini", "systemPrompt": "You are a helpful e-commerce assistant for the admin panel of this online store.", "knowledgeBaseFiles": []},
    "ai_knowledge": "",
}


class SettingPayload(BaseModel):
    value: object | None = None


class OrderStatusPayload(BaseModel):
    status: str
    trackingNumber: str | None = None
    note: str | None = None


async def cache_get(key: str):
    try:
        redis = get_redis()
        val = await redis.get(key)
        return json.loads(val) if val else None
    except Exception:
        return None


async def cache_set(key: str, value, ttl: int = 60):
    try:
        redis = get_redis()
        await redis.setex(key, ttl, json.dumps(value))
    except Exception:
        pass


async def cache_del(*keys: str):
    try:
        redis = get_redis()
        for key in keys:
            await redis.delete(key)
    except Exception:
        pass


@router.get("/stats")
async def admin_stats(db: Session = Depends(get_db)):
    cached = await cache_get("admin:stats")
    if cached:
        return cached
    orders_total = db.execute(text("SELECT COUNT(*) FROM orders")).scalar() or 0
    revenue = db.execute(text(
        "SELECT COALESCE(SUM(amount), 0) FROM payments WHERE status IN ('completed','paid')"
    )).scalar() or 0
    customers = db.execute(text("SELECT COUNT(*) FROM users WHERE role::text = 'customer'")).scalar() or 0
    products = db.execute(text("SELECT COUNT(*) FROM products WHERE active = true")).scalar() or 0
    result = {
        "orders": int(orders_total),
        "revenue": float(revenue),
        "customers": int(customers),
        "products": int(products),
    }
    await cache_set("admin:stats", result, ttl=120)
    return result


@router.get("/orders")
async def admin_get_orders(
    page: int = 1,
    limit: int = 20,
    status: str = None,
    search: str = None,
    db: Session = Depends(get_db),
):
    cache_key = f"admin:orders:{page}:{limit}:{status}:{search}"
    cached = await cache_get(cache_key)
    if cached:
        return cached

    where_clauses = []
    params: dict = {"limit": limit, "offset": (page - 1) * limit}

    if status and status != "all":
        where_clauses.append("o.status::text = :status")
        params["status"] = status
    if search:
        where_clauses.append('(o.id::text ILIKE :search OR u.email ILIKE :search OR u.name ILIKE :search)')
        params["search"] = f"%{search}%"

    where_sql = ("WHERE " + " AND ".join(where_clauses)) if where_clauses else ""

    rows = db.execute(text(f"""
        SELECT o.id, o."orderNumber", o."userId", u.name AS customer_name, u.email AS customer_email,
               o.total, o.subtotal, o."shippingCost", o.status::text,
               o."shippingFullName", o."shippingAddress", o."shippingCity",
               o."shippingPostalCode", o."shippingCountry", o."shippingPhone",
               o."shippingEmail", o."paymentMethod"::text, o."paymentStatus"::text,
               o."paymentReference", o."trackingNumber", o."createdAt"
        FROM orders o
        LEFT JOIN users u ON u.id = o."userId"
        {where_sql}
        ORDER BY o."createdAt" DESC
        LIMIT :limit OFFSET :offset
    """), params).fetchall()

    total_count = db.execute(text(f"""
        SELECT COUNT(*) FROM orders o
        LEFT JOIN users u ON u.id = o."userId"
        {where_sql}
    """), {k: v for k, v in params.items() if k not in ("limit", "offset")}).scalar() or 0

    result = [
        {
            "id": r.id,
            "orderNumber": r.orderNumber,
            "userId": r.userId,
            "customerName": r.customer_name,
            "customerEmail": r.customer_email,
            "shippingFullName": r.shippingFullName,
            "shippingAddress": r.shippingAddress,
            "shippingCity": r.shippingCity,
            "shippingPostalCode": r.shippingPostalCode,
            "shippingCountry": r.shippingCountry,
            "shippingPhone": r.shippingPhone,
            "shippingEmail": r.shippingEmail,
            "total": float(r.total) if r.total else 0,
            "subtotal": float(r.subtotal) if r.subtotal else 0,
            "shippingCost": float(r.shippingCost) if r.shippingCost else 0,
            "status": r.status,
            "paymentMethod": r.paymentMethod,
            "paymentStatus": r.paymentStatus,
            "paymentReference": r.paymentReference,
            "trackingNumber": r.trackingNumber,
            "createdAt": r.createdAt.isoformat() if r.createdAt else None,
        }
        for r in rows
    ]
    await cache_set(cache_key, result, ttl=30)
    return result


@router.get("/orders/{order_id}")
async def admin_get_order(order_id: int, db: Session = Depends(get_db)):
    cache_key = f"admin:order:{order_id}"
    cached = await cache_get(cache_key)
    if cached:
        return cached
    row = db.execute(text("""
        SELECT o.id, o."userId", u.name, u.email, o.total,
               o.status::text, o."shippingAddress", o."createdAt"
        FROM orders o LEFT JOIN users u ON u.id = o."userId"
        WHERE o.id = :id
    """), {"id": order_id}).fetchone()
    if not row:
        raise HTTPException(404, "Order not found")
    items = db.execute(text("""
        SELECT oi.id, oi."productId" AS product_id, p.name AS product_name,
               oi.quantity, oi."unitPrice" AS unit_price
        FROM order_items oi
        LEFT JOIN products p ON p.id = oi."productId"
        WHERE oi."orderId" = :id
    """), {"id": order_id}).fetchall()
    result = {
        "id": row.id,
        "userId": row.userId,
        "customerName": row.name,
        "customerEmail": row.email,
        "total": float(row.total) if row.total else 0,
        "status": row.status,
        "shippingAddress": row.shippingAddress,
        "createdAt": row.createdAt.isoformat() if row.createdAt else None,
        "items": [
            {
                "id": i.id,
                "productId": i.product_id,
                "productName": i.product_name,
                "quantity": i.quantity,
                "unitPrice": float(i.unit_price) if i.unit_price else 0,
            }
            for i in items
        ],
    }
    await cache_set(cache_key, result, ttl=60)
    return result


@router.patch("/orders/{order_id}/status")
async def update_order_status(order_id: int, payload: OrderStatusPayload, db: Session = Depends(get_db)):
    valid = {
        "pending", "confirmed", "processing", "payment_confirmed",
        "shipped", "out_for_delivery", "delivered", "cancelled", "refunded"
    }
    if payload.status not in valid:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {valid}")
    db.execute(text(
        "UPDATE orders SET status = CAST(:status AS order_status) WHERE id = :id"
    ), {"status": payload.status, "id": order_id})
    db.commit()
    await cache_del(f"admin:order:{order_id}", "admin:stats")
    redis = get_redis()
    try:
        keys = await redis.keys("admin:orders:*")
        for k in keys:
            await redis.delete(k)
    except Exception:
        pass
    return {"success": True}


@router.get("/branches")
async def admin_get_branches(db: Session = Depends(get_db)):
    cached = await cache_get("admin:branches")
    if cached:
        return cached
    try:
        rows = db.execute(text(
    'SELECT id, name, address, phone, email, latitude, longitude, "isMain", active, hours FROM branches ORDER BY id'
        )).mappings().fetchall()
        result = [
            {
                "id": r["id"],
                "name": r["name"],
                "address": r["address"] or "",
                "phone": r["phone"] or "",
                "email": r["email"] or "",
                "lat": str(r["latitude"] or 0),
                "lng": str(r["longitude"] or 0),
                "isMain": r["isMain"] or False,
                "active": r["active"] or True,
                "hours": r["hours"] or [],
            }
            for r in rows
        ]
    except Exception:
        result = []
    await cache_set("admin:branches", result, ttl=300)
    return result

class BranchPayload(BaseModel):
    name: str
    address: str = ""
    phone: str = ""
    email: str = ""
    lat: str = "0"
    lng: str = "0"
    isMain: bool = False
    active: bool = True
    hours: list = []

@router.post("/branches")
async def admin_create_branch(payload: BranchPayload, db: Session = Depends(get_db)):
    db.execute(text(
        'INSERT INTO branches (name, address, phone, email, latitude, longitude, "isMain", active, hours) '
        'VALUES (:name, :address, :phone, :email, :lat, :lng, :isMain, :active, :hours::jsonb)'
    ), {
        "name": payload.name, "address": payload.address,
        "phone": payload.phone, "email": payload.email,
        "lat": float(payload.lat), "lng": float(payload.lng),
        "isMain": payload.isMain, "active": payload.active,
        "hours": __import__("json").dumps(payload.hours),
    })
    db.commit()
    await cache_del("admin:branches")
    return {"success": True}

@router.put("/branches/{branch_id}")
async def admin_update_branch(branch_id: int, payload: BranchPayload, db: Session = Depends(get_db)):
    db.execute(text(
        'UPDATE branches SET name=:name, address=:address, phone=:phone, email=:email, '
        'latitude=:lat, longitude=:lng, "isMain"=:isMain, active=:active, hours=:hours::jsonb '
        'WHERE id=:id'
    ), {
        "name": payload.name, "address": payload.address,
        "phone": payload.phone, "email": payload.email,
        "lat": float(payload.lat), "lng": float(payload.lng),
        "isMain": payload.isMain, "active": payload.active,
        "hours": __import__("json").dumps(payload.hours),
        "id": branch_id,
    })
    db.commit()
    await cache_del("admin:branches")
    return {"success": True}

@router.delete("/branches/{branch_id}")
async def admin_delete_branch(branch_id: int, db: Session = Depends(get_db)):
    db.execute(text("DELETE FROM branches WHERE id = :id"), {"id": branch_id})
    db.commit()
    await cache_del("admin:branches")
    return {"success": True}

@router.get("/settings")
async def admin_settings():
    return {"settings": deepcopy(ADMIN_SETTINGS)}


@router.get("/settings/{key}")
async def get_admin_setting(key: str):
    if key not in ADMIN_SETTINGS:
        raise HTTPException(status_code=404, detail="Unknown admin setting")
    return deepcopy(ADMIN_SETTINGS[key])


@router.put("/settings/{key}")
async def put_admin_setting(key: str, payload: SettingPayload):
    ADMIN_SETTINGS[key] = payload.value
    return deepcopy(ADMIN_SETTINGS[key])


@router.patch("/settings/{key}")
async def patch_admin_setting(key: str, payload: SettingPayload):
    ADMIN_SETTINGS[key] = payload.value
    return deepcopy(ADMIN_SETTINGS[key])


@router.get("/products")
async def admin_get_products(search: str = None, db: Session = Depends(get_db)):
    cache_key = f"admin:products:{search}"
    cached = await cache_get(cache_key)
    if cached:
        return cached
    from models.product import Product as ProductModel
    query = db.query(ProductModel)
    if search:
        query = query.filter(ProductModel.name.ilike(f"%{search}%"))
    products = query.all()
    result = [
        {
            "id": p.id, "name": p.name, "slug": p.slug, "price": p.price,
            "description": p.description, "image_url": p.image_url,
            "category": p.category.name if p.category else None,
            "brand": p.brand, "stock_quantity": p.stock_quantity or 0,
            "is_active": p.is_active,
        }
        for p in products
    ]
    await cache_set(cache_key, result, ttl=60)
    return result

# ─── Category helpers ─────────────────────────────────────────
def _slugify(name: str) -> str:
    return _re.sub(r'[^a-z0-9-]', '', name.lower().replace(' ', '-'))

class CategoryPayload(BaseModel):
    id: Optional[int] = None
    name: str
    slug: Optional[str] = None
    description: Optional[str] = None
    imageUrl: Optional[str] = None
    icon: Optional[str] = None
    featured: bool = False
    active: bool = True
    parentId: Optional[int] = None

class ReorderPayload(BaseModel):
    ids: List[int]

@router.get("/categories")
async def admin_get_categories(db: Session = Depends(get_db)):
    cats = db.query(CategoryModel).order_by(CategoryModel.order, CategoryModel.id).all()
    return [
        {
            "id": c.id, "name": c.name, "slug": c.slug,
            "description": c.description, "imageUrl": c.imageUrl,
            "icon": c.icon, "featured": c.featured,
            "active": c.active, "parentId": c.parentId,
            "order": c.order,
        }
        for c in cats
    ]

@router.post("/categories")
async def admin_create_category(payload: CategoryPayload, db: Session = Depends(get_db)):
    slug = payload.slug or _slugify(payload.name)
    cat = CategoryModel(
        name=payload.name, slug=slug,
        description=payload.description, imageUrl=payload.imageUrl,
        icon=payload.icon, featured=payload.featured,
        active=payload.active, parentId=payload.parentId,
    )
    db.add(cat)
    db.commit()
    db.refresh(cat)
    return {
        "id": cat.id, "name": cat.name, "slug": cat.slug,
        "description": cat.description, "imageUrl": cat.imageUrl,
        "icon": cat.icon, "featured": cat.featured,
        "active": cat.active, "parentId": cat.parentId,
        "order": cat.order,
    }

@router.put("/categories/{cat_id}")
async def admin_update_category(cat_id: int, payload: CategoryPayload, db: Session = Depends(get_db)):
    cat = db.query(CategoryModel).filter(CategoryModel.id == cat_id).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")
    cat.name = payload.name
    cat.slug = payload.slug or _slugify(payload.name)
    cat.description = payload.description
    cat.imageUrl = payload.imageUrl
    cat.icon = payload.icon
    cat.featured = payload.featured
    cat.active = payload.active
    cat.parentId = payload.parentId
    db.commit()
    db.refresh(cat)
    return {
        "id": cat.id, "name": cat.name, "slug": cat.slug,
        "description": cat.description, "imageUrl": cat.imageUrl,
        "icon": cat.icon, "featured": cat.featured,
        "active": cat.active, "parentId": cat.parentId,
        "order": cat.order,
    }

@router.delete("/categories/{cat_id}")
async def admin_delete_category(cat_id: int, db: Session = Depends(get_db)):
    db.query(CategoryModel).filter(CategoryModel.id == cat_id).delete()
    db.commit()
    return {"success": True}

@router.post("/categories/reorder")
async def admin_reorder_categories(payload: ReorderPayload, db: Session = Depends(get_db)):
    for i, cat_id in enumerate(payload.ids):
        db.query(CategoryModel).filter(CategoryModel.id == cat_id).update({CategoryModel.order: i})
    db.commit()
    return {"success": True}

@router.get("/export-database")
async def export_database():
    return {"exportedAt": "catalogue", "settings": deepcopy(ADMIN_SETTINGS)}


@router.get("/global-search")
async def global_search(q: str):
    return {"results": []}


@router.get("/notifications")
async def get_admin_notifications():
    return []


@router.get("/notifications/unread-count")
async def get_unread_count():
    return {"count": 0}


@router.get("/announcements")
async def admin_get_announcements():
    return [
        {"id": 1, "active": True, "title": "Welcome to NEXTBIT", "content": "Your e-commerce platform is live!"}
    ]

@router.get("/banners")
async def admin_get_banners():
    return []

@router.get("/promotions")
async def admin_get_promotions():
    return []

@router.post("/marketing/ai-campaign")
async def ai_campaign(request: Request):
    body = await request.json()
    return {"status": "queued", "message": "AI campaign generation is not yet implemented."}

@router.post("/ai/train")
async def ai_train(request: Request):
    return {"status": "ok", "message": "Training not yet implemented."}

@router.get("/system/endpoints")
async def system_endpoints():
    return {"endpoints": []}
