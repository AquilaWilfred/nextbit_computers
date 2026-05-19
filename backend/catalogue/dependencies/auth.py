# routers/technician/dependencies/auth.py
from typing import Optional

from fastapi import Depends, HTTPException, Query
from sqlalchemy.orm import Session
from db.postgres import get_db
from models.technician import TechnicianProfile

def get_technician_by_user_id(user_id: int, db: Session) -> TechnicianProfile:
    """Get technician profile by user ID."""
    tech = db.query(TechnicianProfile).filter(TechnicianProfile.user_id == user_id).first()
    if not tech:
        raise HTTPException(status_code=404, detail="Technician profile not found")
    return tech

async def require_technician(
    user_id: int = Query(..., description="User ID"),
    db: Session = Depends(get_db)
) -> TechnicianProfile:
    """Dependency to require a valid technician profile."""
    return get_technician_by_user_id(user_id, db)

async def optional_technician(
    user_id: Optional[int] = Query(None, description="User ID"),
    db: Session = Depends(get_db)
) -> Optional[TechnicianProfile]:
    """Optional technician dependency."""
    if not user_id:
        return None
    try:
        return get_technician_by_user_id(user_id, db)
    except HTTPException:
        return None