from datetime import datetime, timedelta
from schemas.vip.vip import ShipmentTypeEnum, ShipmentStatusEnum
from models.vip.vip import TierEnum



TIER_PRICING = {
    TierEnum.GOLD: 2500,
    TierEnum.PLATINUM: 7500,
    TierEnum.DIAMOND: 15000,
}

TIER_BENEFITS = {
    TierEnum.GOLD: [
        "Priority customer support",
        "Exclusive discounts",
        "Early access to sales",
        "Free standard shipping",
    ],
    TierEnum.PLATINUM: [
        "All Gold benefits",
        "Express shipping",
        "Personal concierge",
        "VIP event invites",
        "Exclusive products",
    ],
    TierEnum.DIAMOND: [
        "All Platinum benefits",
        "International white-glove service",
        "Dedicated account manager",
        "Custom product sourcing",
        "Emergency assistance",
    ],
}

SHIPMENT_COST = {
    ShipmentTypeEnum.EXPRESS: 1500,
    ShipmentTypeEnum.INTERNATIONAL: 25000,
}


def calculate_shipment_cost(shipment_type: ShipmentTypeEnum, weight: float, declared_value: int) -> int:
    """Calculate shipment cost based on type and weight"""
    base_cost = SHIPMENT_COST.get(shipment_type, 1500)
    if shipment_type == "international":
        return base_cost + int(weight * 500) + int(declared_value * 0.01)
    return base_cost + int(weight * 200)


def calculate_expiry_date(tier: TierEnum) -> datetime:
    """Calculate membership expiry date (1 year from now)"""
    return datetime.now() + timedelta(days=365)


def get_tier_benefits(tier: TierEnum) -> list:
    """Get benefits for a specific tier"""
    return TIER_BENEFITS.get(tier, [])


def get_tier_price(tier: TierEnum) -> int:
    """Get annual price for a tier"""
    return TIER_PRICING.get(tier, 2500)