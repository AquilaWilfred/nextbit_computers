from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, List
from enum import Enum


class InsuranceType(str, Enum):
    GOODS_IN_TRANSIT = "goods_in_transit"
    DEVICE_PROTECTION = "device_protection"


class PolicyStatus(str, Enum):
    ACTIVE = "active"
    EXPIRED = "expired"
    CLAIMED = "claimed"


class ClaimStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"


# ========== Product Schemas ==========
class InsuranceProductResponse(BaseModel):
    id: int
    type: InsuranceType
    name: str
    description: str
    coverage_amount: int
    premium_amount: int
    premium_period: str
    duration_days: int
    features: List[str]

    class Config:
        from_attributes = True


# ========== Policy Schemas ==========
class InsurancePolicyCreate(BaseModel):
    type: InsuranceType
    order_id: Optional[int] = None
    device_serial: Optional[str] = None
    device_brand: Optional[str] = None
    device_model: Optional[str] = None


class InsurancePolicyResponse(BaseModel):
    id: int
    policy_number: str
    type: InsuranceType
    coverage_amount: int
    premium_paid: int
    status: PolicyStatus
    order_id: Optional[int] = None
    tracking_number: Optional[str] = None
    device_serial: Optional[str] = None
    device_brand: Optional[str] = None
    device_model: Optional[str] = None
    start_date: datetime
    expiry_date: datetime
    created_at: datetime

    class Config:
        from_attributes = True


# ========== Claim Schemas ==========
class InsuranceClaimCreate(BaseModel):
    policy_id: int
    claim_type: str
    amount: float = Field(gt=0)
    description: str = Field(min_length=10)


class InsuranceClaimResponse(BaseModel):
    id: int
    claim_number: str
    policy_id: int
    claim_type: str
    amount_requested: int
    amount_approved: Optional[int] = None
    description: str
    status: ClaimStatus
    rejection_reason: Optional[str] = None
    created_at: datetime
    reviewed_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ClaimReviewRequest(BaseModel):
    action: str  # "approved" or "rejected"
    amount_approved: Optional[int] = None
    rejection_reason: Optional[str] = None


# ========== Admin Stats ==========
class AdminStatsResponse(BaseModel):
    total_policies: int
    active_policies: int
    expired_policies: int
    claimed_policies: int
    transit_policies: int
    device_policies: int
    total_claims: int
    pending_claims: int
    approved_claims: int
    rejected_claims: int
    total_coverage: int
    total_premiums_collected: int
    total_claims_approved_amount: int
    total_claims_pending_amount: int
    total_clients: int


# ========== User Stats ==========
class UserInsuranceStatsResponse(BaseModel):
    total_policies: int
    active_policies: int
    total_claims: int
    approved_claims: int
    total_coverage: int
    total_premiums_paid: int

    class Config:
        from_attributes = True