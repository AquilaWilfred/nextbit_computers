from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, List
from enum import Enum


class CardProductType(str, Enum):
    E_NEXTBIT = "e_nextbit"
    VISA_CYBER = "visa_cyber"
    VISA_BLACK = "visa_black"


class ApplicationStatus(str, Enum):
    PENDING = "pending"
    UNDER_REVIEW = "under_review"
    APPROVED = "approved"
    REJECTED = "rejected"


class CardStatus(str, Enum):
    ACTIVE = "active"
    FROZEN = "frozen"
    EXPIRED = "expired"
    CANCELLED = "cancelled"
    PENDING_ACTIVATION = "pending_activation"


class KYCStatus(str, Enum):
    VERIFIED = "verified"
    PENDING = "pending"
    FAILED = "failed"
    EXPIRED = "expired"


class TransactionType(str, Enum):
    PURCHASE = "purchase"
    DEPOSIT = "deposit"
    WITHDRAWAL = "withdrawal"
    REFUND = "refund"
    FEE = "fee"


class TransactionStatus(str, Enum):
    COMPLETED = "completed"
    PENDING = "pending"
    FAILED = "failed"
    FLAGGED = "flagged"


# ========== Card Product Schemas ==========
class CardProductBase(BaseModel):
    product_type: CardProductType
    name: str
    annual_fee: int = 0
    foreign_txn_fee: float = 0
    atm_fee: int = 0
    cashback_rate: float = 0
    features: List[str] = []
    benefits: List[str] = []
    requirements: List[str] = []
    popular: bool = False
    color_bg: Optional[str] = None
    color_accent: Optional[str] = None


class CardProductResponse(CardProductBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


# ========== Application Schemas ==========
class CardApplicationCreate(BaseModel):
    product_type: CardProductType
    full_name: str
    id_number: str
    phone: str
    email: str
    employment: str


class CardApplicationResponse(BaseModel):
    id: int
    product_type: CardProductType
    full_name: str
    id_number: str
    phone: str
    email: str
    employment: str
    status: ApplicationStatus
    risk_score: int
    rejection_reason: Optional[str] = None
    applied_at: datetime
    reviewed_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ApplicationReviewRequest(BaseModel):
    action: str  # "approved" or "rejected"
    rejection_reason: Optional[str] = None


# ========== Virtual Card Schemas ==========
class VirtualCardResponse(BaseModel):
    id: int
    card_number: str
    last_four: str
    expiry_month: str
    expiry_year: str
    balance: int
    total_spent: int
    status: CardStatus
    fraud_flag: bool
    issued_at: datetime
    expires_at: datetime
    product_type: CardProductType

    class Config:
        from_attributes = True


class CardStatsResponse(BaseModel):
    rewards_earned: int
    security_level: str
    total_spent: int
    cards_issued: int


class ToggleFreezeRequest(BaseModel):
    freeze: bool


# ========== Transaction Schemas ==========
class TransactionResponse(BaseModel):
    id: int
    merchant: str
    amount: int
    type: TransactionType
    status: TransactionStatus
    category: Optional[str] = None
    country: Optional[str] = None
    description: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ========== Card Holder Schemas ==========
class CardHolderResponse(BaseModel):
    id: int
    user_id: int
    full_name: str
    id_number: str
    phone: str
    email: str
    employment: str
    kyc_status: KYCStatus
    cards: int = 0
    created_at: datetime

    class Config:
        from_attributes = True


class KYCUpdateRequest(BaseModel):
    status: KYCStatus


# ========== Admin Stats Schemas ==========
class AdminStatsResponse(BaseModel):
    total_cards: int
    active_cards: int
    frozen_cards: int
    pending_applications: int
    approved_today: int
    rejected_today: int
    total_spend_volume: int
    total_loaded_balance: int
    fraud_flags: int
    expiring_soon: int
    total_holders: int
    new_holders_this_month: int


# ========== Card List Response ==========
class CardRecordResponse(BaseModel):
    id: int
    holder_name: str
    holder_email: str
    card_type: CardProductType
    card_number: str
    last_four: str
    status: CardStatus
    balance: int
    total_spent: int
    issued_at: datetime
    expires_at: datetime
    fraud_flag: bool
    country: str

    class Config:
        from_attributes = True