from typing import Dict, Any

def detect_anomaly(hardware: Dict[str, Any]) -> dict:
    """
    Placeholder anomaly detection.
    Replace with trained IsolationForest model.
    """
    score = 0.0
    details = []

    cpu_temp = hardware.get("cpu_temperature", 0)
    if cpu_temp > 90:
        score += 0.5
        details.append(f"CPU temperature critical: {cpu_temp}°C")

    disk_health = hardware.get("disk_health_percent", 100)
    if disk_health < 50:
        score += 0.4
        details.append(f"Disk health low: {disk_health}%")

    memory_errors = hardware.get("memory_errors", 0)
    if memory_errors > 0:
        score += 0.3
        details.append(f"Memory errors detected: {memory_errors}")

    risk_level = "low" if score < 0.3 else "medium" if score < 0.6 else "high"

    return {
        "is_anomaly": score > 0.3,
        "anomaly_score": round(min(score, 1.0), 2),
        "risk_level": risk_level,
        "details": "; ".join(details) if details else "All systems nominal",
    }
