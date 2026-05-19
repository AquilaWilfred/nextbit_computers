from pydantic import BaseModel, Field

class PricingRequest(BaseModel):
    product_id: str
    cost_price: float = Field(gt=0)
    category: str
    current_stock: int = Field(ge=0)

class PricingResponse(BaseModel):
    product_id: str
    suggested_price: float
    margin_percent: float
    strategy: str
