# app/models/credit.py

from sqlalchemy import Column, Integer, String, Numeric, DateTime, ForeignKey, Text, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from db.postgres import Base
import enum

class PaymentTerms(enum.Enum):
    net_15 = "net_15"
    net_30 = "net_30"
    net_60 = "net_60"
    net_90 = "net_90"
    cod = "cod"  # Cash on Delivery

class CreditAccount(Base):
    __tablename__ = "credit_accounts"

    id               = Column(String, primary_key=True)
    company_id       = Column(String, ForeignKey("b2b_applications.id"), nullable=False, index=True, unique=True)
    credit_limit     = Column(Numeric(10, 2), nullable=False, default=0)
    available_credit = Column(Numeric(10, 2), nullable=False, default=0)
    payment_terms    = Column(Enum(PaymentTerms), default=PaymentTerms.net_30, nullable=False)
    status           = Column(String, nullable=False, default="active")  # active, suspended, closed
    created_at       = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at       = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    company          = relationship("B2BApplication", back_populates="credit_account")