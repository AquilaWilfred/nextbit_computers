from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Boolean, JSON, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from db.postgres import Base
import enum

class ConflictPriority(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"

class ConflictStatus(str, enum.Enum):
    PENDING = "pending"
    INVESTIGATING = "investigating"
    RESOLVED = "resolved"
    ESCALATED = "escalated"

class ResolutionStatus(str, enum.Enum):
    PENDING_ACCEPTANCE = "pending_acceptance"
    ACCEPTED = "accepted"
    REJECTED = "rejected"

class TimelineEventType(str, enum.Enum):
    STATUS_CHANGE = "status_change"
    MESSAGE = "message"
    ATTACHMENT = "attachment"
    ESCALATION = "escalation"
    RESOLUTION_PROPOSED = "resolution_proposed"
    RESOLUTION_ACCEPTED = "resolution_accepted"
    RESOLUTION_REJECTED = "resolution_rejected"
    AGENT_ASSIGNED = "agent_assigned"
    SLA_OVERRIDE = "sla_override"

class ConflictReport(Base):
    __tablename__ = "conflict_reports"

    id = Column(Integer, primary_key=True, autoincrement=True)
    reference_number = Column(String(20), unique=True, nullable=False)
    type = Column(String(50), nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    status = Column(Enum(ConflictStatus), default=ConflictStatus.PENDING)
    priority = Column(Enum(ConflictPriority), default=ConflictPriority.MEDIUM)
    
    # Customer info
    customer_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    customer_name = Column(String(255))
    customer_email = Column(String(255))
    
    # Reference linking
    reference_id = Column(String(100))
    reference_type = Column(String(50))
    
    # Assignment
    assigned_agent_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    assigned_agent_name = Column(String(255), nullable=True)
    
    # SLA tracking
    sla_deadline = Column(DateTime, nullable=False)
    sla_overridden_at = Column(DateTime, nullable=True)
    sla_overridden_by = Column(String(255), nullable=True)
    
    # Resolution
    resolution = Column(Text, nullable=True)
    resolution_status = Column(Enum(ResolutionStatus), nullable=True)
    
    # Satisfaction
    satisfaction_rating = Column(Integer, nullable=True)
    satisfaction_comment = Column(Text, nullable=True)
    
    # Attachments (stored as JSON array of {name, size, type, url})
    attachments = Column(JSON, default=list)
    
    # Timelines (stored as JSON array)
    timeline = Column(JSON, default=list)
    
    # Timestamps
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())
    
    # Relationships
    customer = relationship("User", foreign_keys=[customer_id])
    assigned_agent = relationship("User", foreign_keys=[assigned_agent_id])