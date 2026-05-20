from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, List
from enum import Enum

class PriorityEnum(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"

class StatusEnum(str, Enum):
    PENDING = "pending"
    INVESTIGATING = "investigating"
    RESOLVED = "resolved"
    ESCALATED = "escalated"

class ResolutionStatusEnum(str, Enum):
    PENDING_ACCEPTANCE = "pending_acceptance"
    ACCEPTED = "accepted"
    REJECTED = "rejected"

class TimelineEventTypeEnum(str, Enum):
    STATUS_CHANGE = "status_change"
    MESSAGE = "message"
    ATTACHMENT = "attachment"
    ESCALATION = "escalation"
    RESOLUTION_PROPOSED = "resolution_proposed"
    RESOLUTION_ACCEPTED = "resolution_accepted"
    RESOLUTION_REJECTED = "resolution_rejected"
    AGENT_ASSIGNED = "agent_assigned"
    SLA_OVERRIDE = "sla_override"

class Attachment(BaseModel):
    name: str
    size: int
    type: str
    url: Optional[str] = None

class TimelineEvent(BaseModel):
    id: str
    timestamp: datetime
    actor: str  # "user" | "agent" | "system"
    actor_name: str
    type: TimelineEventTypeEnum
    content: str
    attachments: Optional[List[Attachment]] = None

class ConflictReportBase(BaseModel):
    type: str
    title: str
    description: str
    priority: PriorityEnum = PriorityEnum.MEDIUM
    reference_id: Optional[str] = None
    reference_type: Optional[str] = None
    attachments: List[Attachment] = []

class ConflictReportCreate(ConflictReportBase):
    pass

class ConflictReportUpdate(BaseModel):
    status: Optional[StatusEnum] = None
    priority: Optional[PriorityEnum] = None
    assigned_agent_id: Optional[int] = None
    assigned_agent_name: Optional[str] = None
    resolution: Optional[str] = None
    sla_deadline: Optional[datetime] = None

class ConflictReportResponse(ConflictReportBase):
    id: int
    reference_number: str
    status: StatusEnum
    customer_name: str
    customer_email: str
    assigned_agent_name: Optional[str] = None
    sla_deadline: datetime
    resolution: Optional[str] = None
    resolution_status: Optional[ResolutionStatusEnum] = None
    satisfaction_rating: Optional[int] = None
    satisfaction_comment: Optional[str] = None
    timeline: List[TimelineEvent]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class MessageCreate(BaseModel):
    text: str
    attachments: List[Attachment] = []

class EscalateRequest(BaseModel):
    reason: str

class ResolutionProposal(BaseModel):
    text: str

class ResolutionRejectRequest(BaseModel):
    reason: str

class SatisfactionRating(BaseModel):
    rating: int = Field(ge=1, le=5)
    comment: Optional[str] = None

class SlaOverrideRequest(BaseModel):
    hours: int = Field(gt=0, le=168)