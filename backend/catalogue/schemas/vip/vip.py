from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, List
from enum import Enum


class TierEnum(str, Enum):
    GOLD = "gold"
    PLATINUM = "platinum"
    DIAMOND = "diamond"


class MemberStatusEnum(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    PENDING = "pending"


class ServiceCategoryEnum(str, Enum):
    SHIPPING = "shipping"
    SUPPORT = "support"
    CONCIERGE = "concierge"
    EXCLUSIVE = "exclusive"


class PurchaseStatusEnum(str, Enum):
    PAID = "paid"
    PENDING = "pending"
    FAILED = "failed"
    REFUNDED = "refunded"


class ShipmentStatusEnum(str, Enum):
    PENDING = "pending"
    IN_TRANSIT = "in_transit"
    DELIVERED = "delivered"
    CANCELLED = "cancelled"


class ShipmentTypeEnum(str, Enum):
    EXPRESS = "express"
    INTERNATIONAL = "international"


# ========== Membership Schemas ==========
class VIPMembershipResponse(BaseModel):
    id: int
    tier: TierEnum
    status: MemberStatusEnum
    auto_renewal: bool
    joined_at: datetime
    expires_at: datetime
    total_spent: int
    services_purchased: int
    location: Optional[str] = None
    benefits: List[str] = []

    class Config:
        from_attributes = True


class UpgradeMembershipRequest(BaseModel):
    tier: TierEnum


class UpdateMembershipRequest(BaseModel):
    tier: Optional[TierEnum] = None
    status: Optional[MemberStatusEnum] = None
    auto_renewal: Optional[bool] = None
    total_spent: Optional[int] = None
    services_purchased: Optional[int] = None
    location: Optional[str] = None


# ========== Service Schemas ==========
class VIPServiceResponse(BaseModel):
    id: int
    name: str
    description: str
    features: List[str]
    category: ServiceCategoryEnum
    pricing_type: str
    pricing_amount: int
    pricing_currency: str
    pricing_period: Optional[str] = None

    class Config:
        from_attributes = True


class PurchaseServiceRequest(BaseModel):
    service_id: int


class ServicePurchaseResponse(BaseModel):
    id: int
    user_id: int
    member_name: str
    service_name: str
    amount: int
    status: PurchaseStatusEnum
    category: ServiceCategoryEnum
    purchased_at: datetime

    class Config:
        from_attributes = True


# ========== Shipment Schemas ==========
class ShipmentRequestCreate(BaseModel):
    type: ShipmentTypeEnum
    destination: str
    weight: float
    declared_value: int


class ShipmentRequestResponse(BaseModel):
    id: int
    member_name: str
    type: ShipmentTypeEnum
    destination: str
    weight: float
    declared_value: int
    status: ShipmentStatusEnum
    cost: int
    tracking_number: Optional[str] = None
    created_at: datetime
    estimated_delivery: datetime

    class Config:
        from_attributes = True


class UpdateShipmentStatusRequest(BaseModel):
    status: ShipmentStatusEnum


# ========== Admin Schemas ==========
class AdminStatsResponse(BaseModel):
    total_members: int
    active_members: int
    pending_members: int
    inactive_members: int
    gold_members: int
    platinum_members: int
    diamond_members: int
    total_mrr: int
    total_spent: int
    total_service_revenue: int
    pending_purchases: int
    shipments_in_transit: int
    shipments_delivered: int
    shipment_revenue: int


class AdminMemberResponse(BaseModel):
    id: int
    name: str
    email: str
    phone: str
    tier: TierEnum
    status: MemberStatusEnum
    joined_at: datetime
    expires_at: datetime
    auto_renewal: bool
    total_spent: int
    services_purchased: int
    location: Optional[str] = None

    class Config:
        from_attributes = True