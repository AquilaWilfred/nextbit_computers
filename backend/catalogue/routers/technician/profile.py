# routers/technician/endpoints/profile.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from db.postgres import get_db
from models.auth import User
from dependencies.auth import require_technician
from schemas.technician.request import TechnicianProfileUpdateRequest
from schemas.technician.response import TechnicianProfileResponse

router = APIRouter()

@router.get("/profile", response_model=TechnicianProfileResponse)
async def get_profile(
    user_id: int = None,
    db: Session = Depends(get_db),
    tech = Depends(require_technician)
):
    """Get technician profile details."""
    user = db.query(User).filter(User.id == user_id).first()
    
    return TechnicianProfileResponse(
        id=tech.id,
        name=user.name if user else "",
        phone=user.phone if user else "",
        email=user.email if user else "",
        location=tech.location or "",
        bio=tech.bio or "",
        specialties=tech.specialties or [],
        min_price=tech.min_price,
        warranty_days=tech.warranty_days,
        service_radius=tech.service_radius,
        available=tech.available,
        iprs_verified=tech.iprs_verified,
        insured=tech.insured,
        rating=tech.rating,
        review_count=tech.review_count,
        joined_at=tech.joined_at,
    )

@router.put("/profile", response_model=TechnicianProfileResponse)
async def update_profile(
    profile_update: TechnicianProfileUpdateRequest,
    user_id: int = None,
    db: Session = Depends(get_db),
    tech = Depends(require_technician)
):
    """Update technician profile."""
    if profile_update.location is not None:
        tech.location = profile_update.location
    if profile_update.bio is not None:
        tech.bio = profile_update.bio
    if profile_update.specialties is not None:
        tech.specialties = profile_update.specialties
    if profile_update.min_price is not None:
        tech.min_price = profile_update.min_price
    if profile_update.warranty_days is not None:
        tech.warranty_days = profile_update.warranty_days
    if profile_update.service_radius is not None:
        tech.service_radius = profile_update.service_radius
    
    db.commit()
    db.refresh(tech)
    
    user = db.query(User).filter(User.id == user_id).first()
    
    return TechnicianProfileResponse(
        id=tech.id,
        name=user.name if user else "",
        phone=user.phone if user else "",
        email=user.email if user else "",
        location=tech.location or "",
        bio=tech.bio or "",
        specialties=tech.specialties or [],
        min_price=tech.min_price,
        warranty_days=tech.warranty_days,
        service_radius=tech.service_radius,
        available=tech.available,
        iprs_verified=tech.iprs_verified,
        insured=tech.insured,
        rating=tech.rating,
        review_count=tech.review_count,
        joined_at=tech.joined_at,
    )

@router.patch("/availability")
async def toggle_availability(
    available: bool,
    user_id: int = None,
    db: Session = Depends(get_db),
    tech = Depends(require_technician)
):
    """Toggle technician availability status."""
    tech.available = available
    db.commit()
    return {"available": available}