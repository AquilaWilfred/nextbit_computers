# app/models/invoice.py

from sqlalchemy import Column, Integer, String, Numeric, DateTime, ForeignKey, Text, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from db.postgres import Base
import enum

class InvoiceStatus(enum.Enum):
    draft = "draft"
    sent = "sent"
    paid = "paid"
    overdue = "overdue"
    cancelled = "cancelled"

class PaymentMethod(enum.Enum):
    credit = "credit"
    bank_transfer = "bank_transfer"
    mpesa = "mpesa"
    paypal = "paypal"

class Invoice(Base):
    __tablename__ = "invoices"

    id               = Column(String, primary_key=True)
    reference_number = Column(String, unique=True, nullable=False, index=True)
    lpo_id           = Column(String, ForeignKey("lpos.id"), nullable=True, index=True)
    company_id       = Column(String, ForeignKey("b2b_applications.id"), nullable=True, index=True)
    status           = Column(Enum(InvoiceStatus), default=InvoiceStatus.draft, nullable=False)
    total_amount     = Column(Numeric(10, 2), nullable=False, default=0)
    tax_amount       = Column(Numeric(10, 2), nullable=False, default=0)
    shipping_cost    = Column(Numeric(10, 2), nullable=False, default=0)
    currency         = Column(String, nullable=False, default="KES")
    payment_method   = Column(Enum(PaymentMethod), nullable=True)
    payment_reference = Column(String, nullable=True)
    due_date         = Column(DateTime(timezone=True), nullable=True)
    paid_at          = Column(DateTime(timezone=True), nullable=True)
    created_by       = Column(String, nullable=False, index=True)  # email
    notes            = Column(Text, nullable=True)
    created_at       = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at       = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    items            = relationship("models.invoice.InvoiceItem", back_populates="invoice", cascade="all, delete-orphan")
    lpo              = relationship("models.lpo.LPO", back_populates="invoices")
    company          = relationship("models.b2b.B2BApplication", back_populates="invoices")

class InvoiceItem(Base):
    __tablename__ = "invoice_items"

    id         = Column(Integer, primary_key=True, index=True)
    invoice_id = Column(String, ForeignKey("invoices.id", ondelete="CASCADE"), nullable=False, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    quantity   = Column(Integer, nullable=False)
    unit_price = Column(Numeric(10, 2), nullable=False)
    total_price = Column(Numeric(10, 2), nullable=False)
    notes      = Column(Text, nullable=True)

    # Relationships
    invoice    = relationship("models.invoice.Invoice", back_populates="items")
    product    = relationship("models.product.Product")