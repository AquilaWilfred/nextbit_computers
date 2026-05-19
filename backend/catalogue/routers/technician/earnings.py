# routers/technician/endpoints/earnings.py
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from db.postgres import get_db
from models.technician import CompletedJob, PayoutStatusEnum
from dependencies.auth import require_technician
from schemas.technician.response import EarningsResponse, CompletedJobResponse
from utils.technician.mappers import map_completed_job

router = APIRouter()

@router.get("/history", response_model=list[CompletedJobResponse])
async def get_job_history(
    user_id: int = None,
    db: Session = Depends(get_db),
    tech = Depends(require_technician)
):
    """Get completed jobs (history)."""
    completed = db.query(CompletedJob).filter(
        CompletedJob.technician_id == tech.id
    ).all()
    return [map_completed_job(c) for c in completed]

@router.get("/earnings", response_model=EarningsResponse)
async def get_earnings(
    user_id: int = None,
    db: Session = Depends(get_db),
    tech = Depends(require_technician)
):
    """Get earnings summary."""
    thirty_days_ago = datetime.utcnow() - timedelta(days=30)
    sixty_days_ago = datetime.utcnow() - timedelta(days=60)
    
    this_month = db.query(CompletedJob).filter(
        CompletedJob.technician_id == tech.id,
        CompletedJob.completed_at >= thirty_days_ago,
        CompletedJob.payout_status == PayoutStatusEnum.paid
    ).all()
    
    last_month = db.query(CompletedJob).filter(
        CompletedJob.technician_id == tech.id,
        CompletedJob.completed_at >= sixty_days_ago,
        CompletedJob.completed_at < thirty_days_ago,
        CompletedJob.payout_status == PayoutStatusEnum.paid
    ).all()
    
    all_completed = db.query(CompletedJob).filter(
        CompletedJob.technician_id == tech.id
    ).all()
    
    pending = db.query(CompletedJob).filter(
        CompletedJob.technician_id == tech.id,
        CompletedJob.payout_status == PayoutStatusEnum.pending
    ).all()
    
    this_month_total = sum(j.amount for j in this_month)
    last_month_total = sum(j.amount for j in last_month)
    all_time_total = sum(j.amount for j in all_completed if j.payout_status == PayoutStatusEnum.paid)
    pending_total = sum(j.amount for j in pending)
    
    avg_job = this_month_total / len(this_month) if this_month else 0
    completion_rate = int((len(this_month) / (len(this_month) + 2)) * 100) if this_month else 0
    
    return EarningsResponse(
        this_month=this_month_total,
        last_month=last_month_total,
        all_time=all_time_total,
        pending=pending_total,
        jobs_this_month=len(this_month),
        avg_job_value=avg_job,
        completion_rate=completion_rate,
    )