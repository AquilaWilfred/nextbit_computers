from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import cast, String
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from db.postgres import get_db
from routers.auth import get_current_user
from models.auth import User
from models.ewaste.ewaste import (
    EWasteTicket, RecyclingCenter, UserEwasteStats, ComplianceCertificate,
    DeviceCategory, TicketStatus, ComplianceStandard, CATEGORY_POINTS,
    CATEGORY_HAZARDOUS
)
from schemas.ewaste.ewaste import (
    EWasteTicketCreate, EWasteTicketResponse, RecyclingCenterResponse,
    CertificateResponse, UserEwasteStatsResponse
)
from utils.ewaste.ewaste_utils import (
    calculate_points, calculate_co2_saved, get_hazardous_materials,
    generate_ticket_number, generate_certificate_number
)

router = APIRouter(prefix="/api/ewaste", tags=["ewaste"])


# ========== Helper Functions ==========
def get_or_create_user_stats(db: Session, user_id: int) -> UserEwasteStats:
    stats = db.query(UserEwasteStats).filter(UserEwasteStats.user_id == user_id).first()
    if not stats:
        stats = UserEwasteStats(user_id=user_id)
        db.add(stats)
        db.commit()
        db.refresh(stats)
    return stats


def update_user_stats(db: Session, user_id: int, points: int, co2: int, weight: float):
    stats = get_or_create_user_stats(db, user_id)
    stats.total_tickets += 1
    stats.total_points += points
    stats.total_co2_saved += co2
    stats.total_weight_recycled += weight
    db.commit()


# ========== Seed Recycling Centers ==========
def seed_recycling_centers(db: Session):
    if db.query(RecyclingCenter).count() > 0:
        return

    centers = [
        {
            "name": "NextBit Green Hub (Headquarters)",
            "location": "Nairobi CBD, Kenya",
            "latitude": -1.286389,
            "longitude": 36.817223,
            "distance": 2.5,
            "certified": True,
            "certifications": ["NEMA", "ISO 14001", "EU WEEE"],
            "accepts_categories": ["laptop", "desktop", "monitor", "printer", "peripheral", "mobile_phone"],
            "operating_hours": "Mon-Sat 9AM-6PM",
            "phone": "+254 700 123 456",
            "email": "nairobi@nextbitgreen.com",
            "description": "Our flagship recycling facility featuring state-of-the-art e-waste processing equipment.",
            "waste_types": ["Computers", "Laptops", "Monitors", "Printers", "Mobile phones"],
            "price_range": "Free drop-off",
        },
        {
            "name": "EcoTech International Recycling",
            "location": "Westlands, Nairobi",
            "latitude": -1.268473,
            "longitude": 36.804456,
            "distance": 5.1,
            "certified": True,
            "certifications": ["NEMA", "Basel Convention", "R2 Certified"],
            "accepts_categories": ["laptop", "desktop", "battery", "mobile_phone"],
            "operating_hours": "Mon-Fri 8AM-5PM",
            "phone": "+254 711 234 567",
            "email": "ecotech@recycle.co.ke",
            "description": "Specializing in battery recycling and precious metal recovery.",
            "waste_types": ["Laptops", "Batteries", "Mobile phones", "PCBs"],
            "price_range": "Free for bulk recycling",
        },
        {
            "name": "KENSAGE e-Waste Management",
            "location": "Industrial Area, Nairobi",
            "latitude": -1.303889,
            "longitude": 36.846667,
            "distance": 8.3,
            "certified": True,
            "certifications": ["NEMA", "ISO 14001", "RoHS Compliant"],
            "accepts_categories": ["laptop", "desktop", "monitor", "printer", "peripheral", "other", "battery"],
            "operating_hours": "Mon-Sat 7AM-7PM",
            "phone": "+254 722 345 678",
            "email": "kensage@ewaste.ke",
            "description": "Full-service e-waste recycler offering pickup services for large volumes.",
            "waste_types": ["All electronics", "IT Assets", "Server equipment", "Cables"],
            "price_range": "Volume-based pricing",
        },
        {
            "name": "WEEE Recycling Solutions (EU Partner)",
            "location": "Mombasa Road, Nairobi",
            "latitude": -1.329444,
            "longitude": 36.887778,
            "distance": 12.0,
            "certified": True,
            "certifications": ["EU WEEE", "Basel Convention", "NEMA"],
            "accepts_categories": ["laptop", "desktop", "monitor", "mobile_phone", "battery"],
            "operating_hours": "Mon-Fri 9AM-5PM",
            "phone": "+254 733 456 789",
            "email": "weee@recycle.co.ke",
            "description": "EU-certified recycling partner specializing in cross-border compliant recycling.",
            "waste_types": ["IT equipment", "Mobile devices", "Batteries", "Medical electronics"],
            "price_range": "Premium service",
        },
    ]

    for center_data in centers:
        center = RecyclingCenter(**center_data)
        db.add(center)
    db.commit()


# ========== Customer Endpoints ==========
@router.get("/centers", response_model=List[RecyclingCenterResponse])
def get_recycling_centers(
    location: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Get all recycling centers"""
    seed_recycling_centers(db)
    query = db.query(RecyclingCenter).filter(RecyclingCenter.active == True)
    if location:
        query = query.filter(RecyclingCenter.location.ilike(f"%{location}%"))
    centers = query.all()
    return centers


@router.get("/centers/{center_id}", response_model=RecyclingCenterResponse)
def get_recycling_center(center_id: int, db: Session = Depends(get_db)):
    """Get a specific recycling center"""
    center = db.query(RecyclingCenter).filter(RecyclingCenter.id == center_id).first()
    if not center:
        raise HTTPException(status_code=404, detail="Recycling center not found")
    return center


@router.post("/tickets", response_model=EWasteTicketResponse)
def create_ewaste_ticket(
    data: EWasteTicketCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new e-waste disposal ticket"""
    
    points = calculate_points(data.category)
    co2 = calculate_co2_saved(data.weight_kg)
    hazardous = get_hazardous_materials(data.category)
    
    # Find a suitable recycler
    recyclers = db.query(RecyclingCenter).filter(
        RecyclingCenter.active == True,
        cast(RecyclingCenter.accepts_categories, String).ilike(f'%"{data.category.value}"%')
    ).all()
    
    recycler = recyclers[0] if recyclers else None
    recycler_name = recycler.name if recycler else "NextBit Green Hub"
    recycler_certs = recycler.certifications if recycler else ["NEMA"]
    
    ticket = EWasteTicket(
        ticket_number=generate_ticket_number(),
        serial=data.serial,
        brand=data.brand,
        category=data.category,
        weight_kg=data.weight_kg,
        points_awarded=points,
        co2_saved_kg=co2,
        hazardous_materials=hazardous,
        recycler_name=recycler_name,
        recycler_certifications=recycler_certs,
        location=data.location,
        dropoff_branch=data.dropoff_branch,
        user_id=current_user.id,
    )
    
    db.add(ticket)
    db.commit()
    db.refresh(ticket)
    
    # Update user stats
    update_user_stats(db, current_user.id, points, co2, data.weight_kg)
    
    return ticket


@router.get("/tickets", response_model=List[EWasteTicketResponse])
def get_my_tickets(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    status: Optional[str] = None,
    limit: int = 50,
    offset: int = 0
):
    """Get user's e-waste tickets"""
    query = db.query(EWasteTicket).filter(EWasteTicket.user_id == current_user.id)
    if status:
        query = query.filter(EWasteTicket.status == status)
    tickets = query.order_by(EWasteTicket.created_at.desc()).offset(offset).limit(limit).all()
    return tickets


@router.get("/tickets/{ticket_id}", response_model=EWasteTicketResponse)
def get_ticket_detail(
    ticket_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific e-waste ticket"""
    ticket = db.query(EWasteTicket).filter(EWasteTicket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    if ticket.user_id != current_user.id and current_user.role not in ["admin", "agent"]:
        raise HTTPException(status_code=403, detail="Access denied")
    return ticket


@router.get("/certificates", response_model=List[CertificateResponse])
def get_my_certificates(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    limit: int = 50,
    offset: int = 0
):
    """Get user's compliance certificates"""
    certificates = db.query(ComplianceCertificate).filter(
        ComplianceCertificate.user_id == current_user.id
    ).order_by(ComplianceCertificate.issued_at.desc()).offset(offset).limit(limit).all()
    
    result = []
    for cert in certificates:
        ticket = db.query(EWasteTicket).filter(EWasteTicket.id == cert.ticket_id).first()
        result.append({
            "id": cert.id,
            "ticket_number": ticket.ticket_number if ticket else "Unknown",
            "standard": cert.standard,
            "certificate_number": cert.certificate_number,
            "issued_at": cert.issued_at,
            "pdf_url": cert.pdf_url,
        })
    return result


@router.get("/stats", response_model=UserEwasteStatsResponse)
def get_my_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user's e-waste statistics"""
    stats = get_or_create_user_stats(db, current_user.id)
    return stats