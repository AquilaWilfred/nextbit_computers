from fastapi import APIRouter, Depends
from app.schemas.inventory import InventoryRequest, InventoryResponse
from app.services.inventory import optimize
from app.core.security import verify_internal_key

router = APIRouter()

@router.post("/optimize", response_model=InventoryResponse)
async def inventory_optimize(
    request: InventoryRequest,
    _: str = Depends(verify_internal_key),
):
    return await optimize(request)
