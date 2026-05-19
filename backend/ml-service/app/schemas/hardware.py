from pydantic import BaseModel
from typing import Optional, Dict, Any

class AnomalyRequest(BaseModel):
    device_id: str
    hardware: Dict[str, Any]

class AnomalyResponse(BaseModel):
    device_id: str
    is_anomaly: bool
    anomaly_score: float
    risk_level: str
    details: str
