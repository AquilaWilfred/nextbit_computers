from datetime import datetime
import random
import string
from models.listings.tradein import DeviceCondition, CONDITION_MULTIPLIERS


def generate_listing_number() -> str:
    """Generate a unique listing number"""
    year = datetime.now().year
    random_num = ''.join(random.choices(string.digits, k=5))
    return f"TI-{year}-{random_num}"


def calculate_estimated_value(base_price: int, condition: DeviceCondition) -> int:
    """Calculate estimated value based on condition multiplier"""
    multiplier = CONDITION_MULTIPLIERS.get(condition, 0.7)
    return int(base_price * multiplier)


def get_device_label(device_type: str) -> str:
    """Get human-readable device label"""
    from models.listings.tradein import DEVICE_LABELS
    return DEVICE_LABELS.get(device_type, device_type)