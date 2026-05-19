# app/models/lpo.py

from sqlalchemy import Column, Integer, String, Numeric, DateTime, ForeignKey, Text, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from db.postgres import Base
import enum

class LPOStatus(enum.Enum):
    draft = "draft"
    submitted = "submitted"
    pending_approval = "pending_approval"
    approved = "approved"
    rejected = "rejected"
    fulfilled = "fulfilled"
    cancelled = "cancelled"

class LPO(Base):
    __tablename__ = "lpos"
    __table_args__ = {'extend_existing': True}

    id               = Column(String, primary_key=True)
    reference_number = Column(String, unique=True, nullable=False, index=True)
    company_id       = Column(String, ForeignKey("b2b_applications.id"), nullable=True, index=True)
    company          = Column(String, nullable=True)  # Company name
    kra_pin          = Column(String, nullable=True)
    billing_address  = Column(Text, nullable=True)
    due_date         = Column(DateTime(timezone=True), nullable=True)
    description      = Column(Text, nullable=True)
    status           = Column(Enum(LPOStatus), default=LPOStatus.draft, nullable=False)
    amount           = Column(Numeric(10, 2), nullable=False, default=0)  # Subtotal before tax
    tax_amount       = Column(Numeric(10, 2), nullable=False, default=0)
    total_amount     = Column(Numeric(10, 2), nullable=False, default=0)  # amount + tax_amount
    shipping_cost    = Column(Numeric(10, 2), nullable=False, default=0)
    currency         = Column(String, nullable=False, default="KES")
    item_count       = Column(Integer, nullable=False, default=0)
    created_by       = Column(String, nullable=False, index=True)  # email
    approved_by      = Column(String, nullable=True)
    approved_at      = Column(DateTime(timezone=True), nullable=True)
    notes            = Column(Text, nullable=True)
    created_at       = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at       = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    items      = relationship("models.lpo.LPOItem", back_populates="lpo", cascade="all, delete-orphan")
    audit_logs = relationship("models.lpo.LPOAuditLog", back_populates="lpo", cascade="all, delete-orphan")
    company_app = relationship("models.b2b.B2BApplication", back_populates="lpos")
    invoices   = relationship("models.invoice.Invoice", back_populates="lpo", cascade="all, delete-orphan")

class LPOItem(Base):
    __tablename__ = "lpo_items"

    id         = Column(Integer, primary_key=True, index=True)
    lpo_id     = Column(String, ForeignKey("lpos.id", ondelete="CASCADE"), nullable=False, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=True)  # Nullable for manual entry
    product_name = Column(String, nullable=True)  # For manual product entry
    product_category = Column(String, nullable=True)  # For manual product entry
    quantity   = Column(Integer, nullable=False)
    unit_price = Column(Numeric(10, 2), nullable=False)
    total_price = Column(Numeric(10, 2), nullable=False)
    moq        = Column(Integer, nullable=True)  # Minimum Order Quantity
    notes      = Column(Text, nullable=True)

    # Relationships
    lpo        = relationship("LPO", back_populates="items")
    product    = relationship("Product", foreign_keys=[product_id])

class LPOAuditLog(Base):
    __tablename__ = "lpo_audit_logs"

    id         = Column(Integer, primary_key=True, index=True)
    lpo_id     = Column(String, ForeignKey("lpos.id", ondelete="CASCADE"), nullable=False, index=True)
    action     = Column(String, nullable=False)  # e.g., "created", "submitted", "approved"
    user_id    = Column(String, nullable=True)   # email or user id
    timestamp  = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    notes      = Column(Text, nullable=True)

    # Relationships
    lpo        = relationship("models.lpo.LPO", back_populates="audit_logs")