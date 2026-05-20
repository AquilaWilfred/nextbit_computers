from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Float, Boolean, Enum, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from db.postgres import Base
import enum


class CardProductType(str, enum.Enum):
    E_NEXTBIT = "e_nextbit"
    VISA_CYBER = "visa_cyber"
    VISA_BLACK = "visa_black"


class ApplicationStatus(str, enum.Enum):
    PENDING = "pending"
    UNDER_REVIEW = "under_review"
    APPROVED = "approved"
    REJECTED = "rejected"


class CardStatus(str, enum.Enum):
    ACTIVE = "active"
    FROZEN = "frozen"
    EXPIRED = "expired"
    CANCELLED = "cancelled"
    PENDING_ACTIVATION = "pending_activation"


class KYCStatus(str, enum.Enum):
    VERIFIED = "verified"
    PENDING = "pending"
    FAILED = "failed"
    EXPIRED = "expired"


class TransactionType(str, enum.Enum):
    PURCHASE = "purchase"
    DEPOSIT = "deposit"
    WITHDRAWAL = "withdrawal"
    REFUND = "refund"
    FEE = "fee"


class TransactionStatus(str, enum.Enum):
    COMPLETED = "completed"
    PENDING = "pending"
    FAILED = "failed"
    FLAGGED = "flagged"


# ========== Card Products ==========
class CardProduct(Base):
    __tablename__ = "card_products"

    id = Column(Integer, primary_key=True)
    product_type = Column(Enum(CardProductType), unique=True, nullable=False)
    name = Column(String(100), nullable=False)
    annual_fee = Column(Integer, nullable=False, default=0)
    foreign_txn_fee = Column(Float, nullable=False, default=0)
    atm_fee = Column(Integer, nullable=False, default=0)
    cashback_rate = Column(Float, nullable=False, default=0)
    features = Column(JSON, default=list)
    benefits = Column(JSON, default=list)
    requirements = Column(JSON, default=list)
    popular = Column(Boolean, default=False)
    color_bg = Column(String(100))
    color_accent = Column(String(100))
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())


# ========== Card Applications ==========
class CardApplication(Base):
    __tablename__ = "card_applications"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    product_type = Column(Enum(CardProductType), nullable=False)
    full_name = Column(String(255), nullable=False)
    id_number = Column(String(50), nullable=False)
    phone = Column(String(20), nullable=False)
    email = Column(String(255), nullable=False)
    employment = Column(String(50), nullable=False)
    status = Column(Enum(ApplicationStatus), default=ApplicationStatus.PENDING)
    risk_score = Column(Integer, default=0)
    rejection_reason = Column(String(500), nullable=True)
    reviewed_by = Column(String(255), nullable=True)
    reviewed_at = Column(DateTime, nullable=True)
    applied_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())

    # Relationships
    user = relationship("User", foreign_keys=[user_id])


# ========== Virtual Cards ==========
class VirtualCard(Base):
    __tablename__ = "virtual_cards"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    application_id = Column(Integer, ForeignKey("card_applications.id"), nullable=False)
    product_type = Column(Enum(CardProductType), nullable=False)
    card_number = Column(String(19), unique=True, nullable=False)
    last_four = Column(String(4), nullable=False)
    expiry_month = Column(String(2), nullable=False)
    expiry_year = Column(String(2), nullable=False)
    cvv_hash = Column(String(255), nullable=False)  # Store hashed CVV
    balance = Column(Integer, default=0)
    total_spent = Column(Integer, default=0)
    status = Column(Enum(CardStatus), default=CardStatus.PENDING_ACTIVATION)
    fraud_flag = Column(Boolean, default=False)
    issued_at = Column(DateTime, server_default=func.now())
    expires_at = Column(DateTime, nullable=False)
    updated_at = Column(DateTime, onupdate=func.now())

    # Relationships
    user = relationship("User", foreign_keys=[user_id])
    application = relationship("CardApplication", foreign_keys=[application_id])


# ========== Card Holders ==========
class CardHolder(Base):
    __tablename__ = "card_holders"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, unique=True)
    full_name = Column(String(255), nullable=False)
    id_number = Column(String(50), nullable=False)
    phone = Column(String(20), nullable=False)
    email = Column(String(255), nullable=False)
    employment = Column(String(50), nullable=False)
    kyc_status = Column(Enum(KYCStatus), default=KYCStatus.PENDING)
    kyc_verified_at = Column(DateTime, nullable=True)
    kyc_verified_by = Column(String(255), nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())

    # Relationships
    user = relationship("User", foreign_keys=[user_id])


# ========== Transactions ==========
class CardTransaction(Base):
    __tablename__ = "card_transactions"

    id = Column(Integer, primary_key=True)
    card_id = Column(Integer, ForeignKey("virtual_cards.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    merchant = Column(String(255), nullable=False)
    amount = Column(Integer, nullable=False)
    type = Column(Enum(TransactionType), default=TransactionType.PURCHASE)
    status = Column(Enum(TransactionStatus), default=TransactionStatus.PENDING)
    category = Column(String(100))
    country = Column(String(100))
    description = Column(String(500))
    reference = Column(String(100))
    created_at = Column(DateTime, server_default=func.now())

    # Relationships
    card = relationship("VirtualCard", foreign_keys=[card_id])
    user = relationship("User", foreign_keys=[user_id])