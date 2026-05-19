"""
Technician Portal Models
- TechnicianProfile: technician account info, verification, specialties
- RepairRequest: customer incoming repair request
- ActiveJob: accepted repair job with quote
- QuoteLineItem: line items in a quote
- RepairMessage: chat between tech and customer
- PayoutMethod: technician payout account
- CompletedJob: finished repair with payment status
"""

from sqlalchemy import Column, Integer, String, Boolean, DateTime, Float, Enum, ForeignKey, JSON, Text
from sqlalchemy.sql import func
from db.postgres import Base
from enum import Enum as PyEnum

# ────────────────────────────────────────────────────────────────────────────
# Enums
# ────────────────────────────────────────────────────────────────────────────

class JobStatusEnum(str, PyEnum):
    """Job lifecycle stages"""
    new_request = "new_request"
    quote_sent = "quote_sent"
    quote_accepted = "quote_accepted"
    diagnosed = "diagnosed"
    parts_ordered = "parts_ordered"
    in_repair = "in_repair"
    ready = "ready"
    completed = "completed"
    declined = "declined"
    cancelled = "cancelled"

class PayoutStatusEnum(str, PyEnum):
    """Payout states"""
    pending = "pending"        # In escrow
    processing = "processing"  # Being sent
    paid = "paid"              # Released to technician

class UrgencyEnum(str, PyEnum):
    """Request urgency level"""
    low = "low"
    medium = "medium"
    high = "high"

class ServiceModeEnum(str, PyEnum):
    """Service delivery preference"""
    drop_off = "drop_off"
    home_visit = "home_visit"
    either = "either"

class PartsPreferenceEnum(str, PyEnum):
    """Spare parts strategy"""
    oem_only = "oem_only"
    oem_or_aftermarket = "oem_or_aftermarket"
    cheapest = "cheapest"
    tech_choice = "tech_choice"

# ────────────────────────────────────────────────────────────────────────────
# Technician Profile
# ────────────────────────────────────────────────────────────────────────────

class TechnicianProfile(Base):
    __tablename__ = "technician_profiles"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, index=True)
    
    # Verification
    iprs_verified = Column(Boolean, default=False)
    iprs_verified_at = Column(DateTime, nullable=True)
    insured = Column(Boolean, default=False)
    insurance_expiry = Column(DateTime, nullable=True)
    
    # Profile info
    location = Column(String)  # e.g., "Westlands, Nairobi"
    bio = Column(Text)
    specialties = Column(JSON, default=[])  # ["Laptop", "Screen", "Motherboard"]
    min_price = Column(Float, default=1500)  # KES
    warranty_days = Column(Integer, default=30)
    service_radius = Column(Integer, default=10)  # km
    
    # Status
    available = Column(Boolean, default=True)
    
    # Stats
    rating = Column(Float, default=0.0)
    review_count = Column(Integer, default=0)
    joined_at = Column(DateTime, server_default=func.now())
    
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())

# ────────────────────────────────────────────────────────────────────────────
# Repair Request (from customer)
# ────────────────────────────────────────────────────────────────────────────

class RepairRequest(Base):
    __tablename__ = "repair_requests"
    
    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, ForeignKey("users.id"))
    customer_name = Column(String)
    customer_phone = Column(String)
    
    # Device info
    device = Column(String)  # "Laptop"
    brand = Column(String)   # "Dell XPS 15"
    issue = Column(Text)     # Problem description
    
    # Request metadata
    urgency = Column(Enum(UrgencyEnum), default=UrgencyEnum.medium)
    budget = Column(Float)   # KES
    location = Column(String)
    distance_km = Column(Float)  # Distance from technician
    service_mode = Column(Enum(ServiceModeEnum), default=ServiceModeEnum.either)
    parts_preference = Column(Enum(PartsPreferenceEnum), default=PartsPreferenceEnum.oem_or_aftermarket)
    
    # Attachments
    photo_urls = Column(JSON, default=[])
    
    # Lifecycle
    posted_at = Column(DateTime, server_default=func.now())
    expires_at = Column(DateTime)  # 24-48 hours after posting
    status = Column(String, default="open")  # open, quote_sent, accepted, completed
    
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())

# ────────────────────────────────────────────────────────────────────────────
# Active Job (accepted repair)
# ────────────────────────────────────────────────────────────────────────────

class ActiveJob(Base):
    __tablename__ = "active_jobs"
    
    id = Column(Integer, primary_key=True, index=True)
    request_id = Column(Integer, ForeignKey("repair_requests.id"), nullable=True)
    technician_id = Column(Integer, ForeignKey("technician_profiles.id"))
    customer_id = Column(Integer, ForeignKey("users.id"))
    customer_name = Column(String)
    customer_phone = Column(String)
    
    # Job details (from request)
    device = Column(String)
    brand = Column(String)
    issue = Column(Text)
    location = Column(String)
    
    # Quoted price
    quoted_amount = Column(Float)  # Total quote value (KES)
    warranty_days = Column(Integer, default=30)
    
    # Parts
    parts_ordered = Column(Boolean, default=False)
    parts_cost = Column(Float, default=0.0)
    
    # Status lifecycle
    status = Column(Enum(JobStatusEnum), default=JobStatusEnum.quote_sent)
    urgency = Column(Enum(UrgencyEnum))
    service_mode = Column(Enum(ServiceModeEnum))
    
    # Timeline
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    
    # Progress
    progress_percent = Column(Integer, default=0)
    notes = Column(Text, default="")  # Internal technician notes
    
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())

# ────────────────────────────────────────────────────────────────────────────
# Quote Line Items
# ────────────────────────────────────────────────────────────────────────────

class QuoteLineItem(Base):
    __tablename__ = "quote_line_items"
    
    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(Integer, ForeignKey("active_jobs.id", ondelete="CASCADE"))
    
    description = Column(String)  # e.g., "Labour - diagnosis"
    amount = Column(Float)        # KES
    
    created_at = Column(DateTime, server_default=func.now())

# ────────────────────────────────────────────────────────────────────────────
# Repair Messages (chat between tech and customer)
# ────────────────────────────────────────────────────────────────────────────

class RepairMessage(Base):
    __tablename__ = "repair_messages"
    
    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(Integer, ForeignKey("active_jobs.id", ondelete="CASCADE"))
    
    from_user_id = Column(Integer, ForeignKey("users.id"))
    from_role = Column(String)  # "technician" or "customer"
    
    text = Column(Text)
    
    sent_at = Column(DateTime, server_default=func.now())

# ────────────────────────────────────────────────────────────────────────────
# Payout Methods (where technician gets paid)
# ────────────────────────────────────────────────────────────────────────────

class PayoutMethod(Base):
    __tablename__ = "payout_methods"
    
    id = Column(Integer, primary_key=True, index=True)
    technician_id = Column(Integer, ForeignKey("technician_profiles.id", ondelete="CASCADE"))
    
    method_type = Column(String)  # "mpesa", "bank", etc.
    account_identifier = Column(String)  # Phone number, bank account, etc.
    account_name = Column(String)
    is_primary = Column(Boolean, default=False)
    
    created_at = Column(DateTime, server_default=func.now())

# ────────────────────────────────────────────────────────────────────────────
# Completed Jobs (history + payout tracking)
# ────────────────────────────────────────────────────────────────────────────

class CompletedJob(Base):
    __tablename__ = "completed_jobs"
    
    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(Integer, ForeignKey("active_jobs.id"))
    technician_id = Column(Integer, ForeignKey("technician_profiles.id"))
    customer_id = Column(Integer, ForeignKey("users.id"))
    
    customer_name = Column(String)
    device = Column(String)
    issue = Column(Text)
    
    amount = Column(Float)  # What technician earns
    payout_status = Column(Enum(PayoutStatusEnum), default=PayoutStatusEnum.pending)
    payout_released_at = Column(DateTime, nullable=True)
    
    # Customer review
    customer_rating = Column(Integer, nullable=True)  # 1-5
    customer_review = Column(Text, nullable=True)
    
    # Warranty
    warranty_expiry = Column(DateTime)
    
    completed_at = Column(DateTime, server_default=func.now())
    created_at = Column(DateTime, server_default=func.now())
