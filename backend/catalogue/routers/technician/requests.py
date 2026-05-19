# routers/technician/endpoints/requests.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime
from db.postgres import get_db
from models.technician import RepairRequest
from dependencies.auth import require_technician
from schemas.technician.response import IncomingRequestResponse
from utils.technician.mappers import map_incoming_request

router = APIRouter()

@router.get("/requests", response_model=list[IncomingRequestResponse])
async def get_incoming_requests(
    user_id: int = None,
    db: Session = Depends(get_db),
    tech = Depends(require_technician)
):
    """Get incoming repair requests (not yet quoted)."""
    requests = db.query(RepairRequest).filter(
        RepairRequest.status == "open",
        RepairRequest.expires_at > datetime.utcnow()
    ).all()
    
    return [map_incoming_request(r) for r in requests]

@router.post("/requests/{request_id}/decline")
async def decline_request(
    request_id: int,
    user_id: int = None,
    db: Session = Depends(get_db),
    tech = Depends(require_technician)
):
    """Decline a repair request."""
    request = db.query(RepairRequest).filter(RepairRequest.id == request_id).first()
    if not request:
        raise HTTPException(status_code=404, detail="Request not found")
    
    request.status = "declined"
    db.commit()
    
    return {"status": "declined"}