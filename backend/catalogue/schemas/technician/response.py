# routers/technician/schemas/response.py
from pydantic import BaseModel, ConfigDict, Field
from typing import List, Optional
from datetime import datetime


def to_camel(string: str) -> str:
    parts = string.split("_")
    return parts[0] + "".join(word.capitalize() for word in parts[1:])


class CamelModel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class QuoteLineItemResponse(CamelModel):
    id: int
    description: str
    amount: float


class IncomingRequestResponse(CamelModel):
    id: int
    customer_id: Optional[int] = None
    customer_name: str
    customer_phone: str
    device: str
    brand: str
    issue: str
    urgency: str
    budget: float
    location: str
    distance_km: float
    service_mode: str
    parts_preference: str
    photo_urls: List[str] = []
    posted_at: datetime
    expires_at: datetime


class ActiveJobResponse(CamelModel):
    id: int
    request_id: Optional[int]
    customer_id: Optional[int]
    customer_name: str
    customer_phone: str
    device: str
    brand: str
    issue: str
    status: str
    urgency: str
    service_mode: str
    location: str
    quoted_amount: float
    quote_line_items: List[QuoteLineItemResponse]
    parts_ordered: bool
    parts_cost: float
    started_at: Optional[datetime]
    completed_at: Optional[datetime]
    warranty_days: int
    notes: str
    progress_percent: int


class CompletedJobResponse(CamelModel):
    id: int
    customer_name: str
    device: str
    issue: str
    amount: float
    payout_status: str
    completed_at: datetime
    customer_rating: Optional[int]
    customer_review: Optional[str]
    warranty_expiry: datetime


class TechnicianProfileResponse(CamelModel):
    id: int
    name: str
    phone: str
    email: str
    location: str
    bio: str
    specialties: List[str]
    min_price: float
    warranty_days: int
    service_radius: int
    available: bool
    iprs_verified: bool
    insured: bool
    rating: float
    review_count: int
    joined_at: datetime


class EarningsResponse(CamelModel):
    this_month: float
    last_month: float
    all_time: float
    pending: float
    jobs_this_month: int
    avg_job_value: float
    completion_rate: int


class DashboardResponse(CamelModel):
    profile: TechnicianProfileResponse
    incoming_count: int
    active_jobs_count: int
    earnings: EarningsResponse


class MessageResponse(CamelModel):
    id: int
    job_id: int
    from_: str = Field(..., alias="from")
    text: str
    sent_at: datetime
