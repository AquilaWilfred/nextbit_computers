from app.schemas.inventory import InventoryRequest, InventoryResponse
from app.models.inventory import optimize_inventory

async def optimize(request: InventoryRequest) -> InventoryResponse:
    result = optimize_inventory(
        request.current_stock,
        request.daily_sales_rate,
        request.lead_time_days,
    )
    return InventoryResponse(product_id=request.product_id, **result)
