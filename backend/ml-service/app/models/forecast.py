import numpy as np

def predict_demand(historical_days: int, category: str) -> dict:
    """
    Placeholder demand forecasting model.
    Replace with trained scikit-learn model loaded from disk.
    """
    # Simulate category-based demand patterns
    base_demand = {
        "laptop": 45,
        "desktop": 20,
        "components": 80,
        "peripherals": 60,
    }.get(category.lower(), 30)

    noise = np.random.normal(0, base_demand * 0.1)
    predicted = max(0, base_demand + noise)
    confidence = min(0.99, 0.7 + (historical_days / 365) * 0.29)

    return {
        "predicted_demand": round(predicted, 2),
        "confidence": round(confidence, 2),
    }
