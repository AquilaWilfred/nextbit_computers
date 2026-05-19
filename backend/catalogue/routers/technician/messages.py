# routers/technician/messages.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from db.postgres import get_db
from models.technician import ActiveJob, RepairMessage
from models.technician import TechnicianProfile
from dependencies.auth import require_technician
from schemas.technician.request import SendMessageRequest
from schemas.technician.response import MessageResponse

router = APIRouter()

@router.post("/jobs/{job_id}/messages")
async def send_message(
    job_id: int,
    msg_req: SendMessageRequest,
    user_id: int = None,
    db: Session = Depends(get_db),
    tech = Depends(require_technician)
):
    """Send a message on a job."""
    job = db.query(ActiveJob).filter(ActiveJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    # Determine sender role
    from_role = "technician" if job.technician_id == tech.id else "customer"
    
    message = RepairMessage(
        job_id=job_id,
        from_user_id=user_id,
        from_role=from_role,
        text=msg_req.text,
    )
    
    db.add(message)
    db.commit()
    db.refresh(message)
    
    return MessageResponse.model_validate(message)

@router.get("/jobs/{job_id}/messages", response_model=list[MessageResponse])
async def get_job_messages(
    job_id: int,
    user_id: int = None,
    db: Session = Depends(get_db),
    tech = Depends(require_technician)
):
    """Get all messages for a job."""
    messages = db.query(RepairMessage).filter(RepairMessage.job_id == job_id).all()
    return [MessageResponse.model_validate(m) for m in messages]