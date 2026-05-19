from pydantic import BaseModel, Field
from typing import Optional

class ForecastRequest(BaseModel):
    product_id: str
    category: str
    historical_days: Optional[int] = Field(default=30, ge=7, le=365)

class ForecastResponse(BaseModel):
    product_id: str
    category: str
    predicted_demand: float
    confidence: float
    recommendation: str
    forecast_days: int
