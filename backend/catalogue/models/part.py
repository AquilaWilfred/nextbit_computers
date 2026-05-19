from enum import Enum as PyEnum
from sqlalchemy import Column, Integer, String, Float, Boolean, Enum, DateTime
from sqlalchemy.sql import func
from db.postgres import Base


class PartConditionEnum(str, PyEnum):
    oem = "oem"
    new = "new"
    aftermarket = "aftermarket"
    used = "used"


class SparePart(Base):
    __tablename__ = "spare_parts"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    compatibility = Column(String, nullable=False)
    price = Column(Float, nullable=False)
    condition = Column(Enum(PartConditionEnum), nullable=False)
    category = Column(String, nullable=False)
    supplier = Column(String, nullable=False)
    stock = Column(Integer, default=0)
    warranty_days = Column(Integer, default=30)
    available = Column(Boolean, default=True)

    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())
