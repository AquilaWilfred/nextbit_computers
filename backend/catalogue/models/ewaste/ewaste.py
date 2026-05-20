from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Float, Boolean, Enum, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from db.postgres import Base
import enum


class DeviceCategory(str, enum.Enum):
    LAPTOP = "laptop"
    DESKTOP = "desktop"
    MONITOR = "monitor"
    PRINTER = "printer"
    PERIPHERAL = "peripheral"
    OTHER = "other"
    BATTERY = "battery"
    MOBILE_PHONE = "mobile_phone"


class TicketStatus(str, enum.Enum):
    SURRENDERED = "surrendered"
    BATCHED = "batched"
    COLLECTED = "collected"
    CERTIFIED = "certified"
    EXPORTED = "exported"
    RECYCLED = "recycled"


class ComplianceStandard(str, enum.Enum):
    NEMA = "NEMA"
    EU_WEEE = "EU_WEEE"
    BASEL = "BASEL"
    ISO_14001 = "ISO_14001"
    ROHS = "ROHS"


# ========== Category Configuration ==========
CATEGORY_POINTS = {
    DeviceCategory.LAPTOP: 500,
    DeviceCategory.DESKTOP: 400,
    DeviceCategory.MONITOR: 300,
    DeviceCategory.PRINTER: 250,
    DeviceCategory.PERIPHERAL: 100,
    DeviceCategory.OTHER: 50,
    DeviceCategory.BATTERY: 200,
    DeviceCategory.MOBILE_PHONE: 350,
}

CATEGORY_LABELS = {
    DeviceCategory.LAPTOP: "Laptop / Notebook",
    DeviceCategory.DESKTOP: "Desktop / PC Tower",
    DeviceCategory.MONITOR: "Monitor / Display",
    DeviceCategory.PRINTER: "Printer / Scanner",
    DeviceCategory.PERIPHERAL: "Keyboard, Mouse, Cables",
    DeviceCategory.OTHER: "Other Electronics",
    DeviceCategory.BATTERY: "Lithium Battery",
    DeviceCategory.MOBILE_PHONE: "Mobile Phone / Smartphone",
}

CATEGORY_HAZARDOUS = {
    DeviceCategory.LAPTOP: ["Lithium battery", "PCB", "Mercury lamp"],
    DeviceCategory.DESKTOP: ["PCB", "Lead solder", "Capacitors"],
    DeviceCategory.MONITOR: ["Lead in CRT", "Mercury", "PCB"],
    DeviceCategory.PRINTER: ["Toner dust", "Plastic", "Heavy metals"],
    DeviceCategory.PERIPHERAL: ["PVC", "Brominated flame retardants"],
    DeviceCategory.OTHER: ["Mixed e-waste"],
    DeviceCategory.BATTERY: ["Lithium", "Cobalt", "Nickel"],
    DeviceCategory.MOBILE_PHONE: ["Lithium battery", "Precious metals", "Brominated compounds"],
}


# ========== E-Waste Tickets ==========
class EWasteTicket(Base):
    __tablename__ = "ewaste_tickets"

    id = Column(Integer, primary_key=True)
    ticket_number = Column(String(20), unique=True, nullable=False)
    
    # Device information
    serial = Column(String(100), nullable=False)
    brand = Column(String(100), nullable=False)
    category = Column(Enum(DeviceCategory), nullable=False)
    weight_kg = Column(Float, nullable=False)
    
    # Status tracking
    status = Column(Enum(TicketStatus), default=TicketStatus.SURRENDERED)
    points_awarded = Column(Integer, nullable=False)
    co2_saved_kg = Column(Integer, nullable=False)
    
    # Compliance references
    nema_ref = Column(String(100), nullable=True)
    weee_ref = Column(String(100), nullable=True)
    basel_permit = Column(String(100), nullable=True)
    
    # Hazardous materials (JSON array)
    hazardous_materials = Column(JSON, default=list)
    
    # Recycling center info
    recycler_name = Column(String(255), nullable=False)
    recycler_certifications = Column(JSON, default=list)
    
    # Location
    location = Column(String(255), nullable=False)
    dropoff_branch = Column(String(255), nullable=False)
    
    # User association
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Timestamps
    created_at = Column(DateTime, server_default=func.now())
    collected_at = Column(DateTime, nullable=True)
    certified_at = Column(DateTime, nullable=True)
    updated_at = Column(DateTime, onupdate=func.now())
    
    # Relationships
    user = relationship("User", foreign_keys=[user_id])


# ========== Recycling Centers ==========
class RecyclingCenter(Base):
    __tablename__ = "recycling_centers"

    id = Column(Integer, primary_key=True)
    name = Column(String(255), nullable=False)
    location = Column(String(255), nullable=False)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    distance = Column(Float, default=0)
    
    certified = Column(Boolean, default=False)
    certifications = Column(JSON, default=list)
    accepts_categories = Column(JSON, default=list)
    
    operating_hours = Column(String(255), nullable=False)
    phone = Column(String(50), nullable=False)
    email = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    waste_types = Column(JSON, default=list)
    price_range = Column(String(100), nullable=True)
    
    # Statistics
    total_collected = Column(Integer, default=0)
    total_weight_kg = Column(Float, default=0)
    
    active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())


# ========== User E-Waste Stats ==========
class UserEwasteStats(Base):
    __tablename__ = "user_ewaste_stats"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, unique=True)
    
    total_tickets = Column(Integer, default=0)
    total_points = Column(Integer, default=0)
    total_co2_saved = Column(Integer, default=0)
    total_weight_recycled = Column(Float, default=0)
    
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())
    
    # Relationships
    user = relationship("User", foreign_keys=[user_id])


# ========== Compliance Certificate ==========
class ComplianceCertificate(Base):
    __tablename__ = "compliance_certificates"

    id = Column(Integer, primary_key=True)
    ticket_id = Column(Integer, ForeignKey("ewaste_tickets.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    standard = Column(Enum(ComplianceStandard), nullable=False)
    certificate_number = Column(String(100), unique=True, nullable=False)
    issued_at = Column(DateTime, server_default=func.now())
    pdf_url = Column(String(500), nullable=True)
    
    # Relationships
    ticket = relationship("EWasteTicket", foreign_keys=[ticket_id])
    user = relationship("User", foreign_keys=[user_id])