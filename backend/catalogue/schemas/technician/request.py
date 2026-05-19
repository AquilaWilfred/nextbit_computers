# routers/technician/schemas/request.py
from pydantic import BaseModel
from typing import List, Optional

class QuoteLineItemRequest(BaseModel):
    description: str
    amount: float

class TechnicianProfileUpdateRequest(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    location: Optional[str] = None
    bio: Optional[str] = None
    specialties: Optional[List[str]] = None
    min_price: Optional[float] = None
    warranty_days: Optional[int] = None
    service_radius: Optional[int] = None

class SendQuoteRequest(BaseModel):
    request_id: int
    line_items: List[QuoteLineItemRequest]
    notes: str
    warranty_days: int

class UpdateJobStatusRequest(BaseModel):
    status: str

class SendMessageRequest(BaseModel):
    text: str