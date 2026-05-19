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
from .admin import router as admin
from .content import router as content
from .customers import router as customers
from .technician import router as technician

# # Technician sub-routers
# from .technician.dashboard import router as dashboard_router
# from .endpoints.profile import router as profile_router
# from .endpoints.requests import router as requests_router
# from .endpoints.quotes import router as quotes_router
# from .endpoints.jobs import router as jobs_router
# from .endpoints.messages import router as messages_router
# from .endpoints.earnings import router as earnings_router