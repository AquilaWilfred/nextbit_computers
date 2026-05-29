from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, List
from enum import Enum


class DeviceType(str, Enum):
    LAPTOP = "laptop"
    DESKTOP = "desktop"
    TABLET = "tablet"
    MONITOR = "monitor"
    PRINTER = "printer"
    OTHER = "other"
    PHONE = "phone"
    HEADPHONES = "headphones"
    CAMERA = "camera"


class DeviceCondition(str, Enum):
    EXCELLENT = "excellent"
    GOOD = "good"
    FAIR = "fair"


class ListingStatus(str, Enum):
    PENDING_VERIFICATION = "pending_verification"
    LISTED = "listed"
    SOLD = "sold"
    REJECTED = "rejected"


# ========== Listing Schemas ==========
class TradeInListingCreate(BaseModel):
    device_type: DeviceType
    brand: str = Field(min_length=1, max_length=100)
    model: str = Field(min_length=1, max_length=255)
    condition: DeviceCondition
    asking_price_kes: int = Field(gt=0, le=10000000)
    specs: Optional[str] = None
    images: List[str] = []
    location: Optional[str] = None
    drop_branch: str = Field(min_length=1)
    visible: bool = True


class TradeInListingUpdate(BaseModel):
    asking_price_kes: Optional[int] = None
    specs: Optional[str] = None
    images: Optional[List[str]] = None
    location: Optional[str] = None
    drop_branch: Optional[str] = None
    visible: Optional[bool] = None


class TradeInListingResponse(BaseModel):
    id: int
    listing_number: str
    device_type: DeviceType
    brand: str
    model: str
    condition: DeviceCondition
    asking_price_kes: int
    specs: Optional[str] = None
    images: List[str]
    seller_name: str
    seller_rating: float
    location: Optional[str] = None
    drop_branch: str
    status: ListingStatus
    views: int
    credit_issued_kes: Optional[int] = None
    created_at: datetime
    sold_at: Optional[datetime] = None
    visible: bool

    class Config:
        from_attributes = True


# ========== Admin Schemas ==========
class AdminListingResponse(TradeInListingResponse):
    user_id: int
    user_email: str
    rejection_reason: Optional[str] = None
    reviewed_by: Optional[str] = None
    reviewed_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class AdminStatsResponse(BaseModel):
    total_listings: int
    pending_listings: int
    listed_listings: int
    sold_listings: int
    rejected_listings: int
    total_gmv: int
    total_credit_issued: int
    total_views: int
    avg_price: int
    device_breakdown: dict
    branches: List[str]


class StatusUpdateRequest(BaseModel):
    status: ListingStatus
    credit_amount: Optional[int] = None
    rejection_reason: Optional[str] = None


# ========== User Stats Schemas ==========
class UserTradeInStatsResponse(BaseModel):
    total_listings: int
    active_listings: int
    sold_listings: int
    total_credit_earned: int
    total_views: int

    class Config:
        from_attributes = True