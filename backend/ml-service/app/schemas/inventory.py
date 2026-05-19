from pydantic import BaseModel, Field

class InventoryRequest(BaseModel):
    product_id: str
    current_stock: int = Field(ge=0)
    daily_sales_rate: float = Field(gt=0)
    lead_time_days: int = Field(gt=0)

class InventoryResponse(BaseModel):
    product_id: str
    reorder_point: int
    optimal_order_quantity: int
    days_until_stockout: float
    action: str
