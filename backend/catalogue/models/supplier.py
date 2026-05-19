# app/models/supplier.py

from sqlalchemy import Column, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from db.postgres import Base

class Supplier(Base):
    __tablename__ = "b2b_suppliers"

    id = Column(String, primary_key=True)
    company_id = Column(String, ForeignKey("b2b_applications.id", ondelete="SET NULL"), nullable=True, index=True)
    name = Column(String, nullable=False)
    category = Column(String, nullable=True)
    email = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    address = Column(Text, nullable=True)
    created_by = Column(String, nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    company = relationship("models.b2b.B2BApplication", back_populates="suppliers")
