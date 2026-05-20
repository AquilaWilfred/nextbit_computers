from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Float, Boolean, Enum, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from db.postgres import Base
import enum


class InsuranceType(str, enum.Enum):
    GOODS_IN_TRANSIT = "goods_in_transit"
    DEVICE_PROTECTION = "device_protection"


class PolicyStatus(str, enum.Enum):
    ACTIVE = "active"
    EXPIRED = "expired"
    CLAIMED = "claimed"


class ClaimStatus(str, enum.Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"


# ========== Insurance Products (Static) ==========
class InsuranceProduct(Base):
    __tablename__ = "insurance_products"

    id = Column(Integer, primary_key=True)
    type = Column(Enum(InsuranceType), unique=True, nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    coverage_amount = Column(Integer, nullable=False)
    premium_amount = Column(Integer, nullable=False)
    premium_period = Column(String(50), default="one-time")
    duration_days = Column(Integer, nullable=False)
    features = Column(JSON, default=list)
    active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())


# ========== Insurance Policies ==========
class InsurancePolicy(Base):
    __tablename__ = "insurance_policies"

    id = Column(Integer, primary_key=True)
    policy_number = Column(String(50), unique=True, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    type = Column(Enum(InsuranceType), nullable=False)
    coverage_amount = Column(Integer, nullable=False)
    premium_paid = Column(Integer, nullable=False)
    status = Column(Enum(PolicyStatus), default=PolicyStatus.ACTIVE)
    
    # For goods_in_transit
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=True)
    tracking_number = Column(String(255), nullable=True)
    
    # For device_protection
    device_serial = Column(String(255), nullable=True)
    device_brand = Column(String(255), nullable=True)
    device_model = Column(String(255), nullable=True)
    
    # Dates
    start_date = Column(DateTime, server_default=func.now())
    expiry_date = Column(DateTime, nullable=False)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())
    
    # Relationships
    user = relationship("User", foreign_keys=[user_id])


# ========== Insurance Claims ==========
class InsuranceClaim(Base):
    __tablename__ = "insurance_claims"

    id = Column(Integer, primary_key=True)
    claim_number = Column(String(50), unique=True, nullable=False)
    policy_id = Column(Integer, ForeignKey("insurance_policies.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    claim_type = Column(String(100), nullable=False)
    amount_requested = Column(Integer, nullable=False)
    amount_approved = Column(Integer, nullable=True)
    description = Column(Text, nullable=False)
    status = Column(Enum(ClaimStatus), default=ClaimStatus.PENDING)
    
    # Supporting documents
    documents = Column(JSON, default=list)
    
    # Review details
    reviewed_by = Column(String(255), nullable=True)
    reviewed_at = Column(DateTime, nullable=True)
    rejection_reason = Column(String(500), nullable=True)
    
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())
    
    # Relationships
    policy = relationship("InsurancePolicy", foreign_keys=[policy_id])
    user = relationship("User", foreign_keys=[user_id])


# ========== Insurance Stats (User) ==========
class InsuranceStats(Base):
    __tablename__ = "insurance_stats"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, unique=True)
    
    total_policies = Column(Integer, default=0)
    active_policies = Column(Integer, default=0)
    total_claims = Column(Integer, default=0)
    approved_claims = Column(Integer, default=0)
    total_coverage = Column(Integer, default=0)
    total_premiums_paid = Column(Integer, default=0)
    
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())
    
    # Relationships
    user = relationship("User", foreign_keys=[user_id])