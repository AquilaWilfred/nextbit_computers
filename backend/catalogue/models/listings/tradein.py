from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Float, Boolean, Enum, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from db.postgres import Base
import enum


class DeviceType(str, enum.Enum):
    LAPTOP = "laptop"
    DESKTOP = "desktop"
    TABLET = "tablet"
    MONITOR = "monitor"
    PRINTER = "printer"
    OTHER = "other"
    PHONE = "phone"
    HEADPHONES = "headphones"
    CAMERA = "camera"


class DeviceCondition(str, enum.Enum):
    EXCELLENT = "excellent"
    GOOD = "good"
    FAIR = "fair"


class ListingStatus(str, enum.Enum):
    PENDING_VERIFICATION = "pending_verification"
    LISTED = "listed"
    SOLD = "sold"
    REJECTED = "rejected"


# ========== Device Categories ==========
DEVICE_LABELS = {
    DeviceType.LAPTOP: "Laptop",
    DeviceType.DESKTOP: "Desktop / PC",
    DeviceType.TABLET: "Tablet",
    DeviceType.MONITOR: "Monitor",
    DeviceType.PRINTER: "Printer",
    DeviceType.OTHER: "Other",
    DeviceType.PHONE: "Smartphone",
    DeviceType.HEADPHONES: "Headphones",
    DeviceType.CAMERA: "Camera",
}

CONDITION_MULTIPLIERS = {
    DeviceCondition.EXCELLENT: 1.0,
    DeviceCondition.GOOD: 0.8,
    DeviceCondition.FAIR: 0.6,
}


# ========== Trade-In Listings ==========
class TradeInListing(Base):
    __tablename__ = "trade_in_listings"

    id = Column(Integer, primary_key=True)
    listing_number = Column(String(20), unique=True, nullable=False)
    
    # Device information
    device_type = Column(Enum(DeviceType), nullable=False)
    brand = Column(String(100), nullable=False)
    model = Column(String(255), nullable=False)
    condition = Column(Enum(DeviceCondition), nullable=False)
    asking_price_kes = Column(Integer, nullable=False)
    
    # Additional details
    specs = Column(Text, nullable=True)
    images = Column(JSON, default=list)
    
    # Seller information
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    seller_name = Column(String(255), nullable=False)
    seller_rating = Column(Float, default=0)
    
    # Location & drop-off
    location = Column(String(255), nullable=True)
    drop_branch = Column(String(255), nullable=False)
    
    # Status & tracking
    status = Column(Enum(ListingStatus), default=ListingStatus.PENDING_VERIFICATION)
    views = Column(Integer, default=0)
    credit_issued_kes = Column(Integer, nullable=True)
    
    # Admin review
    reviewed_by = Column(String(255), nullable=True)
    reviewed_at = Column(DateTime, nullable=True)
    rejection_reason = Column(String(500), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())
    sold_at = Column(DateTime, nullable=True)
    
    # Relationships
    user = relationship("User", foreign_keys=[user_id])


# ========== User Trade-In Stats ==========
class TradeInStats(Base):
    __tablename__ = "trade_in_stats"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, unique=True)
    
    total_listings = Column(Integer, default=0)
    active_listings = Column(Integer, default=0)
    sold_listings = Column(Integer, default=0)
    total_credit_earned = Column(Integer, default=0)
    total_views = Column(Integer, default=0)
    
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())
    
    # Relationships
    user = relationship("User", foreign_keys=[user_id])


# ========== Trade-In Offers (for buyers) ==========
class TradeInOffer(Base):
    __tablename__ = "trade_in_offers"

    id = Column(Integer, primary_key=True)
    listing_id = Column(Integer, ForeignKey("trade_in_listings.id"), nullable=False)
    buyer_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    offer_amount = Column(Integer, nullable=False)
    status = Column(String(50), default="pending")  # pending, accepted, rejected
    message = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    
    # Relationships
    listing = relationship("TradeInListing", foreign_keys=[listing_id])
    buyer = relationship("User", foreign_keys=[buyer_id])