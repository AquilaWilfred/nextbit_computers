from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
import random
import string

from db.postgres import get_db
from routers.auth import require_role
from models.auth import User
from models.ewaste.ewaste import (
    EWasteTicket, RecyclingCenter, ComplianceCertificate,
    TicketStatus, ComplianceStandard, DeviceCategory,
    CATEGORY_POINTS
)
from schemas.ewaste.ewaste import (
    AdminTicketResponse, RecyclingCenterCreate, RecyclingCenterUpdate,
    RecyclingCenterResponse, TicketStatusUpdate, AdminStatsResponse,
    CertificateResponse
)
from utils.ewaste.ewaste_utils import generate_certificate_number

router = APIRouter(prefix="/api/admin/ewaste", tags=["admin-ewaste"])


# ========== Statistics ==========
@router.get("/stats", response_model=AdminStatsResponse)
def get_admin_stats(
    current_user: User = Depends(require_role(["admin", "agent"])),
    db: Session = Depends(get_db)
):
    """Get e-waste admin dashboard statistics"""
    
    tickets = db.query(EWasteTicket).all()
    centers = db.query(RecyclingCenter).all()
    
    total_tickets = len(tickets)
    total_weight_kg = sum(t.weight_kg for t in tickets)
    total_co2_saved = sum(t.co2_saved_kg for t in tickets)
    total_points_awarded = sum(t.points_awarded for t in tickets)
    
    status_breakdown = {}
    for status in TicketStatus:
        status_breakdown[status.value] = sum(1 for t in tickets if t.status == status)
    
    category_breakdown = {}
    for category in DeviceCategory:
        category_breakdown[category.value] = sum(1 for t in tickets if t.category == category)
    
    nema_count = sum(1 for t in tickets if t.nema_ref)
    weee_count = sum(1 for t in tickets if t.weee_ref)
    basel_count = sum(1 for t in tickets if t.basel_permit)
    
    total_possible = total_tickets * 3 if total_tickets > 0 else 1
    compliance_rate = round(((nema_count + weee_count + basel_count) / total_possible) * 100)
    
    certified_centers = sum(1 for c in centers if c.certified)
    
    return AdminStatsResponse(
        total_tickets=total_tickets,
        total_weight_kg=total_weight_kg,
        total_co2_saved=total_co2_saved,
        total_points_awarded=total_points_awarded,
        total_centers=len(centers),
        certified_centers=certified_centers,
        status_breakdown=status_breakdown,
        category_breakdown=category_breakdown,
        compliance_rate=compliance_rate,
        nema_count=nema_count,
        weee_count=weee_count,
        basel_count=basel_count,
    )


# ========== Tickets Management ==========
@router.get("/tickets", response_model=List[AdminTicketResponse])
def get_all_tickets(
    current_user: User = Depends(require_role(["admin", "agent"])),
    db: Session = Depends(get_db),
    status: Optional[str] = None,
    category: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = 100,
    offset: int = 0
):
    """Get all e-waste tickets with filters"""
    query = db.query(EWasteTicket)
    
    if status:
        query = query.filter(EWasteTicket.status == status)
    if category:
        query = query.filter(EWasteTicket.category == category)
    if search:
        query = query.filter(
            (EWasteTicket.ticket_number.ilike(f"%{search}%")) |
            (EWasteTicket.brand.ilike(f"%{search}%")) |
            (EWasteTicket.serial.ilike(f"%{search}%"))
        )
    
    tickets = query.order_by(EWasteTicket.created_at.desc()).offset(offset).limit(limit).all()
    
    result = []
    for ticket in tickets:
        user = db.query(User).filter(User.id == ticket.user_id).first()
        result.append(AdminTicketResponse(
            id=ticket.id,
            ticket_number=ticket.ticket_number,
            serial=ticket.serial,
            brand=ticket.brand,
            category=ticket.category,
            weight_kg=ticket.weight_kg,
            status=ticket.status,
            points_awarded=ticket.points_awarded,
            co2_saved_kg=ticket.co2_saved_kg,
            nema_ref=ticket.nema_ref,
            weee_ref=ticket.weee_ref,
            basel_permit=ticket.basel_permit,
            hazardous_materials=ticket.hazardous_materials,
            recycler_name=ticket.recycler_name,
            recycler_certifications=ticket.recycler_certifications,
            location=ticket.location,
            dropoff_branch=ticket.dropoff_branch,
            created_at=ticket.created_at,
            collected_at=ticket.collected_at,
            certified_at=ticket.certified_at,
            user_name=user.name if user else "Unknown",
            user_email=user.email if user else "unknown@email.com",
        ))
    
    return result


@router.patch("/tickets/{ticket_id}/status")
def update_ticket_status(
    ticket_id: int,
    data: TicketStatusUpdate,
    current_user: User = Depends(require_role(["admin", "agent"])),
    db: Session = Depends(get_db)
):
    """Update ticket status and generate compliance references"""
    ticket = db.query(EWasteTicket).filter(EWasteTicket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    ticket.status = data.status
    ticket.updated_at = datetime.now()
    
    if data.status == TicketStatus.COLLECTED and not ticket.collected_at:
        ticket.collected_at = datetime.now()
    
    if data.status == TicketStatus.CERTIFIED and not ticket.certified_at:
        ticket.certified_at = datetime.now()
        
        # Generate compliance references
        if not ticket.nema_ref:
            ticket.nema_ref = f"NEMA/EW/{datetime.now().year}/{random.randint(10000, 99999)}"
        if not ticket.weee_ref:
            ticket.weee_ref = f"WEEE/EU/{datetime.now().year}/{random.randint(10000, 99999)}"
        
        # Create compliance certificates
        for standard in [ComplianceStandard.NEMA, ComplianceStandard.EU_WEEE]:
            existing = db.query(ComplianceCertificate).filter(
                ComplianceCertificate.ticket_id == ticket.id,
                ComplianceCertificate.standard == standard
            ).first()
            if not existing:
                cert = ComplianceCertificate(
                    ticket_id=ticket.id,
                    user_id=ticket.user_id,
                    standard=standard,
                    certificate_number=generate_certificate_number(standard, ticket.id),
                )
                db.add(cert)
    
    if data.status == TicketStatus.EXPORTED and not ticket.basel_permit:
        ticket.basel_permit = f"BASEL/KEN/{datetime.now().year}/{random.randint(10000, 99999)}"
        
        existing = db.query(ComplianceCertificate).filter(
            ComplianceCertificate.ticket_id == ticket.id,
            ComplianceCertificate.standard == ComplianceStandard.BASEL
        ).first()
        if not existing:
            cert = ComplianceCertificate(
                ticket_id=ticket.id,
                user_id=ticket.user_id,
                standard=ComplianceStandard.BASEL,
                certificate_number=generate_certificate_number(ComplianceStandard.BASEL, ticket.id),
            )
            db.add(cert)
    
    db.commit()
    
    return {"success": True, "status": data.status}


# ========== Recycling Centers Management ==========
@router.get("/centers", response_model=List[RecyclingCenterResponse])
def get_all_centers(
    current_user: User = Depends(require_role(["admin", "agent"])),
    db: Session = Depends(get_db),
    limit: int = 100,
    offset: int = 0
):
    """Get all recycling centers"""
    centers = db.query(RecyclingCenter).offset(offset).limit(limit).all()
    return centers


@router.post("/centers", response_model=RecyclingCenterResponse)
def create_recycling_center(
    data: RecyclingCenterCreate,
    current_user: User = Depends(require_role(["admin", "agent"])),
    db: Session = Depends(get_db)
):
    """Create a new recycling center"""
    center = RecyclingCenter(**data.dict())
    db.add(center)
    db.commit()
    db.refresh(center)
    return center


@router.patch("/centers/{center_id}", response_model=RecyclingCenterResponse)
def update_recycling_center(
    center_id: int,
    data: RecyclingCenterUpdate,
    current_user: User = Depends(require_role(["admin", "agent"])),
    db: Session = Depends(get_db)
):
    """Update a recycling center"""
    center = db.query(RecyclingCenter).filter(RecyclingCenter.id == center_id).first()
    if not center:
        raise HTTPException(status_code=404, detail="Recycling center not found")
    
    updates = data.dict(exclude_unset=True)
    for key, value in updates.items():
        setattr(center, key, value)
    
    db.commit()
    db.refresh(center)
    return center


@router.delete("/centers/{center_id}")
def delete_recycling_center(
    center_id: int,
    current_user: User = Depends(require_role(["admin", "agent"])),
    db: Session = Depends(get_db)
):
    """Soft delete a recycling center"""
    center = db.query(RecyclingCenter).filter(RecyclingCenter.id == center_id).first()
    if not center:
        raise HTTPException(status_code=404, detail="Recycling center not found")
    
    center.active = False
    db.commit()
    return {"success": True}


# ========== Certificates Management ==========
@router.get("/certificates", response_model=List[CertificateResponse])
def get_all_certificates(
    current_user: User = Depends(require_role(["admin", "agent"])),
    db: Session = Depends(get_db),
    limit: int = 200,
    offset: int = 0
):
    """Get all compliance certificates"""
    certificates = db.query(ComplianceCertificate).order_by(
        ComplianceCertificate.issued_at.desc()
    ).offset(offset).limit(limit).all()
    
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