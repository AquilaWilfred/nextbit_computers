# routers/technician/__init__.py
from fastapi import APIRouter

# Import all endpoint routers
from .dashboard import router as dashboard_router
from .profile import router as profile_router
from .requests import router as requests_router
from .quotes import router as quotes_router
from .jobs import router as jobs_router
from .messages import router as messages_router
from .earnings import router as earnings_router
from .ws.websocket_manager import router as ws_router

# Create main router
router = APIRouter()

# Include all sub-routers
router.include_router(dashboard_router, tags=["technician-dashboard"])
router.include_router(profile_router, tags=["technician-profile"])
router.include_router(requests_router, tags=["technician-requests"])
router.include_router(quotes_router, tags=["technician-quotes"])
router.include_router(jobs_router, tags=["technician-jobs"])
router.include_router(messages_router, tags=["technician-messages"])
router.include_router(earnings_router, tags=["technician-earnings"])
router.include_router(ws_router,        tags=["technician-ws"])