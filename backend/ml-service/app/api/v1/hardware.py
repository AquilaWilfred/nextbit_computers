from fastapi import APIRouter, Depends
from app.schemas.hardware import AnomalyRequest, AnomalyResponse
from app.services.hardware import analyze_hardware
from app.core.security import verify_internal_key

router = APIRouter()

@router.post("/analyze", response_model=AnomalyResponse)
async def hardware_anomaly(
    request: AnomalyRequest,
    _: str = Depends(verify_internal_key),
):
    return await analyze_hardware(request)
