from app.schemas.pricing import PricingRequest, PricingResponse
from app.models.pricing import suggest_price

async def get_pricing(request: PricingRequest) -> PricingResponse:
    result = suggest_price(request.cost_price, request.category, request.current_stock)
    return PricingResponse(product_id=request.product_id, **result)
