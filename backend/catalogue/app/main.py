from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from typing import List
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import inspect, text
from routers import auth, products, orders, cart, categories, settings, branches, addresses, wishlist, delivery, admin, content, customers, network, technician, repairs
from routers.payments import router as payments
from db.postgres import engine, Base
from models import auth as auth_model, product, order, b2b as b2b_model, lpo, invoice, credit, supplier, technician as technician_model, part as part_model
from routers.b2b import router as b2b_router


app = FastAPI(title="NEXTBIT Catalogue API", version="1.0.0", redirect_slashes=False)

Base.metadata.create_all(bind=engine)


def ensure_products_image_url_column() -> None:
    inspector = inspect(engine)
    if not inspector.has_table("products"):
        return

    existing_columns = [column["name"] for column in inspector.get_columns("products")]
    if "image_url" not in existing_columns:
        with engine.connect() as conn:
            conn.execute(text("ALTER TABLE products ADD COLUMN image_url VARCHAR"))
            conn.commit()


ensure_products_image_url_column()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:8080"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth,       prefix="/api/auth",       tags=["auth"])
app.include_router(products,   prefix="/api/products",   tags=["products"])
app.include_router(orders,     prefix="/api/orders",     tags=["orders"])
app.include_router(cart,       prefix="/api/cart",       tags=["cart"])
app.include_router(categories, prefix="/api/categories", tags=["categories"])
app.include_router(settings,   prefix="/api/settings",   tags=["settings"])
app.include_router(branches,   prefix="/api/branches",   tags=["branches"])
app.include_router(addresses,  prefix="/api/addresses",  tags=["addresses"])
app.include_router(wishlist,   prefix="/api/wishlist",   tags=["wishlist"])
app.include_router(delivery,   prefix="/api/delivery",   tags=["delivery"])
app.include_router(admin,      prefix="/api/admin",      tags=["admin"])
app.include_router(b2b_router, prefix="/api/b2b", tags=["b2b"])
app.include_router(b2b_router, prefix="/api/admin/b2b", tags=["admin-b2b"])
app.include_router(payments,   prefix="/api/admin/payments", tags=["admin-payments"])
app.include_router(content,    prefix="/api/content",    tags=["content"])
app.include_router(customers,   prefix="/api/customers",  tags=["customers"])
app.include_router(technician,  prefix="/api/technician", tags=["technician"])
app.include_router(repairs.router, prefix="/api/repairs",    tags=["repairs"])
app.include_router(network.router, prefix="/api/admin/network", tags=["network"])
app.include_router(network.router, prefix="/network",            tags=["network-internal"])
app.include_router(customers,   prefix="/api/admin/customers", tags=["admin-customers"])

# Connection manager
class AnnouncementManager:
    def __init__(self):
        self.active: List[WebSocket] = []

    async def connect(self, ws: WebSocket):
        await ws.accept()
        self.active.append(ws)

    def disconnect(self, ws: WebSocket):
        self.active = [c for c in self.active if c is not ws]

    async def broadcast(self, message: str):
        for ws in self.active:
            try:
                await ws.send_text(message)
            except Exception:
                pass

announcements = AnnouncementManager()

@app.websocket("/api/ws/announcements")
async def ws_announcements(websocket: WebSocket):
    await announcements.connect(websocket)
    try:
        while True:
            await websocket.receive_text()  # keep connection alive
    except WebSocketDisconnect:
        announcements.disconnect(websocket)

@app.get("/")
async def root():
    return {"message": "NEXTBIT Catalogue API"}

@app.get("/health")
async def health():
    return {"status": "ok", "service": "catalogue"}



# ── B2B route scope fix ───────────────────────────────────────────────────────
# Remove the broad double-mount and replace with scoped includes
