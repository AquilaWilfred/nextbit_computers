from fastapi import APIRouter, Depends
from app.schemas.market import ForecastRequest, ForecastResponse
from app.services.market import forecast_demand
from app.core.security import verify_internal_key

router = APIRouter()

@router.post("/forecast", response_model=ForecastResponse)
async def market_forecast(
    request: ForecastRequest,
    _: str = Depends(verify_internal_key),
):
    return await forecast_demand(request)
