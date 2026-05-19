from app.schemas.hardware import AnomalyRequest, AnomalyResponse
from app.models.anomaly import detect_anomaly

async def analyze_hardware(request: AnomalyRequest) -> AnomalyResponse:
    result = detect_anomaly(request.hardware)
    return AnomalyResponse(device_id=request.device_id, **result)
