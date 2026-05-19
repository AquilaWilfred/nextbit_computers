from fastapi import APIRouter

router = APIRouter()

@router.get("/health")
async def health():
    return {
        "status": "ok",
        "service": "nextbit-ml",
        "version": "0.1.0",
        "models": {
            "market_forecast":      "ready",
            "hardware_anomaly":     "ready",
            "pricing_engine":       "ready",
            "inventory_optimizer":  "ready",
        }
    }
