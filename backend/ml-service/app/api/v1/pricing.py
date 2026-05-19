from fastapi import APIRouter, Depends
from app.schemas.pricing import PricingRequest, PricingResponse
from app.services.pricing import get_pricing
from app.core.security import verify_internal_key

router = APIRouter()

@router.post("/suggest", response_model=PricingResponse)
async def pricing_suggest(
    request: PricingRequest,
    _: str = Depends(verify_internal_key),
):
    return await get_pricing(request)
