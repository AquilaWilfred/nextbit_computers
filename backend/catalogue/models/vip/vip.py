from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Float, Boolean, Enum, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from db.postgres import Base
import enum


class TierEnum(str, enum.Enum):
    GOLD = "gold"
    PLATINUM = "platinum"
    DIAMOND = "diamond"


class MemberStatusEnum(str, enum.Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    PENDING = "pending"


class ServiceCategoryEnum(str, enum.Enum):
    SHIPPING = "shipping"
    SUPPORT = "support"
    CONCIERGE = "concierge"
    EXCLUSIVE = "exclusive"


class PricingTypeEnum(str, enum.Enum):
    ONE_TIME = "one-time"
    SUBSCRIPTION = "subscription"


class PurchaseStatusEnum(str, enum.Enum):
    PAID = "paid"
    PENDING = "pending"
    FAILED = "failed"
    REFUNDED = "refunded"


class ShipmentStatusEnum(str, enum.Enum):
    PENDING = "pending"
    IN_TRANSIT = "in_transit"
    DELIVERED = "delivered"
    CANCELLED = "cancelled"


class ShipmentTypeEnum(str, enum.Enum):
    EXPRESS = "express"
    INTERNATIONAL = "international"


# ========== VIP Memberships ==========
class VIPMembership(Base):
    __tablename__ = "vip_memberships"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, unique=True)
    tier = Column(Enum(TierEnum), default=TierEnum.GOLD)
    status = Column(Enum(MemberStatusEnum), default=MemberStatusEnum.PENDING)
    auto_renewal = Column(Boolean, default=True)
    joined_at = Column(DateTime, server_default=func.now())
    expires_at = Column(DateTime, nullable=False)
    total_spent = Column(Integer, default=0)
    services_purchased = Column(Integer, default=0)
    location = Column(String(255), nullable=True)

    # Relationships
    user = relationship("User", foreign_keys=[user_id])


# ========== VIP Services ==========
class VIPService(Base):
    __tablename__ = "vip_services"

    id = Column(Integer, primary_key=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    features = Column(JSON, default=list)
    category = Column(Enum(ServiceCategoryEnum), nullable=False)
    pricing_type = Column(Enum(PricingTypeEnum), default=PricingTypeEnum.ONE_TIME)
    pricing_amount = Column(Integer, nullable=False)
    pricing_currency = Column(String(3), default="KES")
    pricing_period = Column(String(20), nullable=True)
    active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())


# ========== Service Purchases ==========
class VIPServicePurchase(Base):
    __tablename__ = "vip_service_purchases"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    service_id = Column(Integer, ForeignKey("vip_services.id"), nullable=False)
    member_name = Column(String(255), nullable=False)
    service_name = Column(String(255), nullable=False)
    amount = Column(Integer, nullable=False)
    status = Column(Enum(PurchaseStatusEnum), default=PurchaseStatusEnum.PENDING)
    category = Column(Enum(ServiceCategoryEnum), nullable=False)
    purchased_at = Column(DateTime, server_default=func.now())
    transaction_reference = Column(String(255), nullable=True)

    # Relationships
    user = relationship("User", foreign_keys=[user_id])
    service = relationship("VIPService", foreign_keys=[service_id])


# ========== Shipment Requests ==========
class VIPShipmentRequest(Base):
    __tablename__ = "vip_shipment_requests"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    member_name = Column(String(255), nullable=False)
    type = Column(Enum(ShipmentTypeEnum), nullable=False)
    destination = Column(String(255), nullable=False)
    weight = Column(Float, nullable=False)
    declared_value = Column(Integer, nullable=False)
    status = Column(Enum(ShipmentStatusEnum), default=ShipmentStatusEnum.PENDING)
    cost = Column(Integer, nullable=False)
    tracking_number = Column(String(100), nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    estimated_delivery = Column(DateTime, nullable=False)

    # Relationships
    user = relationship("User", foreign_keys=[user_id])


# ========== VIP Benefits (tier-specific) ==========
class VIPBenefits(Base):
    __tablename__ = "vip_benefits"

    id = Column(Integer, primary_key=True)
    tier = Column(Enum(TierEnum), nullable=False)
    benefit_name = Column(String(255), nullable=False)
    benefit_description = Column(Text, nullable=True)
    sort_order = Column(Integer, default=0)