from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, List
from enum import Enum


class DeviceCategory(str, Enum):
    LAPTOP = "laptop"
    DESKTOP = "desktop"
    MONITOR = "monitor"
    PRINTER = "printer"
    PERIPHERAL = "peripheral"
    OTHER = "other"
    BATTERY = "battery"
    MOBILE_PHONE = "mobile_phone"


class TicketStatus(str, Enum):
    SURRENDERED = "surrendered"
    BATCHED = "batched"
    COLLECTED = "collected"
    CERTIFIED = "certified"
    EXPORTED = "exported"
    RECYCLED = "recycled"


class ComplianceStandard(str, Enum):
    NEMA = "NEMA"
    EU_WEEE = "EU_WEEE"
    BASEL = "BASEL"
    ISO_14001 = "ISO_14001"
    ROHS = "ROHS"


# ========== Ticket Schemas ==========
class EWasteTicketCreate(BaseModel):
    serial: str
    brand: str
    category: DeviceCategory
    weight_kg: float = Field(gt=0, le=500)
    location: str
    dropoff_branch: str


class EWasteTicketResponse(BaseModel):
    id: int
    ticket_number: str
    serial: str
    brand: str
    category: DeviceCategory
    weight_kg: float
    status: TicketStatus
    points_awarded: int
    co2_saved_kg: int
    nema_ref: Optional[str] = None
    weee_ref: Optional[str] = None
    basel_permit: Optional[str] = None
    hazardous_materials: List[str]
    recycler_name: str
    recycler_certifications: List[str]
    location: str
    dropoff_branch: str
    created_at: datetime
    collected_at: Optional[datetime] = None
    certified_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class TicketStatusUpdate(BaseModel):
    status: TicketStatus
    notes: Optional[str] = None


# ========== Recycling Center Schemas ==========
class RecyclingCenterCreate(BaseModel):
    name: str
    location: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    certified: bool = False
    certifications: List[str] = []
    accepts_categories: List[DeviceCategory] = []
    operating_hours: str
    phone: str
    email: str
    description: Optional[str] = None
    waste_types: List[str] = []
    price_range: Optional[str] = None


class RecyclingCenterUpdate(BaseModel):
    name: Optional[str] = None
    location: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    certified: Optional[bool] = None
    certifications: Optional[List[str]] = None
    accepts_categories: Optional[List[DeviceCategory]] = None
    operating_hours: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    description: Optional[str] = None
    waste_types: Optional[List[str]] = None
    price_range: Optional[str] = None
    active: Optional[bool] = None


class RecyclingCenterResponse(BaseModel):
    id: int
    name: str
    location: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    distance: float
    certified: bool
    certifications: List[str]
    accepts_categories: List[DeviceCategory]
    operating_hours: str
    phone: str
    email: str
    description: Optional[str] = None
    waste_types: List[str]
    price_range: Optional[str] = None
    total_collected: int
    total_weight_kg: float

    class Config:
        from_attributes = True


# ========== Certificate Schemas ==========
class CertificateResponse(BaseModel):
    id: int
    ticket_number: str
    standard: ComplianceStandard
    certificate_number: str
    issued_at: datetime
    pdf_url: Optional[str] = None

    class Config:
        from_attributes = True


# ========== Stats Schemas ==========
class UserEwasteStatsResponse(BaseModel):
    total_tickets: int
    total_points: int
    total_co2_saved: int
    total_weight_recycled: float

    class Config:
        from_attributes = True


class AdminStatsResponse(BaseModel):
    total_tickets: int
    total_weight_kg: float
    total_co2_saved: int
    total_points_awarded: int
    total_centers: int
    certified_centers: int
    status_breakdown: dict
    category_breakdown: dict
    compliance_rate: float
    nema_count: int
    weee_count: int
    basel_count: int


# ========== Admin Ticket Response ==========
class AdminTicketResponse(EWasteTicketResponse):
    user_name: str
    user_email: str

    class Config:
        from_attributes = True