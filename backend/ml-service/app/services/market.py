from app.schemas.market import ForecastRequest, ForecastResponse
from app.models.forecast import predict_demand

async def forecast_demand(request: ForecastRequest) -> ForecastResponse:
    result = predict_demand(request.historical_days, request.category)
    recommendation = (
        "High demand expected — increase stock"
        if result["predicted_demand"] > 50
        else "Moderate demand — maintain current stock"
    )
    return ForecastResponse(
        product_id=request.product_id,
        category=request.category,
        predicted_demand=result["predicted_demand"],
        confidence=result["confidence"],
        recommendation=recommendation,
        forecast_days=request.historical_days,
    )
