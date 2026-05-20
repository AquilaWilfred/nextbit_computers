# Routers package
from .auth import router as auth
from .products import router as products
from .orders import router as orders
from .cart import router as cart
from .categories import router as categories
from .settings import router as settings
from .branches import router as branches
from .addresses import router as addresses
from .wishlist import router as wishlist
from .delivery import router as delivery
from .visa.visa import router as visa
from .visa.admin_visa import router as admin_visa
from .vip.vip import router as vip
from .vip.admin_vip import router as admin_vip
from .conflicts.conflicts import router as conflicts
from .admin import router as admin
from .content import router as content
from .customers import router as customers
from .technician import router as technician
from .repairs import router as repairs
from .network import router as network
from .ewaste.ewaste import router as ewaste
from .ewaste.admin_ewaste import router as admin_ewaste
from .insurance.insurance import router as insurance
from .insurance.admin_insurance import router as admin_insurance
from .listings.tradein import router as tradein
from .listings.admin_tradein import router as admin_tradein

# # Technician sub-routers
# from .technician.dashboard import router as dashboard_router
# from .endpoints.profile import router as profile_router
# from .endpoints.requests import router as requests_router
# from .endpoints.quotes import router as quotes_router
# from .endpoints.jobs import router as jobs_router
# from .endpoints.messages import router as messages_router
# from .endpoints.earnings import router as earnings_router