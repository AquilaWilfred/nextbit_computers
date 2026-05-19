from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from app.core.config import settings
from app.hooks.startup import on_startup
from app.hooks.shutdown import on_shutdown
from app.middleware.logging import logging_middleware
from app.middleware.rate_limit import rate_limit_middleware
from app.api.v1 import health, market, hardware, pricing, inventory

app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="NextBit AI/ML Service",
    docs_url="/docs",
    redoc_url="/redoc",
)

# Middleware
app.add_middleware(CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(BaseHTTPMiddleware, dispatch=logging_middleware)
app.add_middleware(BaseHTTPMiddleware, dispatch=rate_limit_middleware)

# Lifecycle
app.add_event_handler("startup", on_startup)
app.add_event_handler("shutdown", on_shutdown)

# Routers
app.include_router(health.router,     tags=["Health"])
app.include_router(market.router,     prefix="/api/v1/market",    tags=["Market"])
app.include_router(hardware.router,   prefix="/api/v1/hardware",  tags=["Hardware"])
app.include_router(pricing.router,    prefix="/api/v1/pricing",   tags=["Pricing"])
app.include_router(inventory.router,  prefix="/api/v1/inventory", tags=["Inventory"])
