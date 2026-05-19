# routers/technician/dashboard.py
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from db.postgres import get_db
from models.technician import RepairRequest, ActiveJob, CompletedJob, PayoutStatusEnum
from models.auth import User
from dependencies.auth import require_technician
from schemas.technician.response import DashboardResponse, EarningsResponse, TechnicianProfileResponse

router = APIRouter()

@router.get("/dashboard-data")
async def get_dashboard_data(
    user_id: int = None,
    db: Session = Depends(get_db),
    tech = Depends(require_technician)
):
    """Get all technician dashboard data in one request."""
    # Get user info
    user = db.query(User).filter(User.id == user_id).first()
    
    # Incoming requests
    incoming = db.query(RepairRequest).filter(
        RepairRequest.status == "open",
        RepairRequest.expires_at > datetime.utcnow()
    ).all()
    
    # Active jobs
    jobs = db.query(ActiveJob).filter(
        ActiveJob.technician_id == tech.id,
        ActiveJob.status.notin_(["completed", "declined", "cancelled"])
    ).all()
    
    # Completed jobs
    completed = db.query(CompletedJob).filter(
        CompletedJob.technician_id == tech.id
    ).all()
    
    # Earnings
    thirty_days_ago = datetime.utcnow() - timedelta(days=30)
    this_month = db.query(CompletedJob).filter(
        CompletedJob.technician_id == tech.id,
        CompletedJob.completed_at >= thirty_days_ago,
        CompletedJob.payout_status == PayoutStatusEnum.paid
    ).all()
    
    from utils.technician.mappers import map_incoming_request, map_active_job, map_completed_job
    
    return {
        "profile": {
            "id": tech.id,
            "name": user.name if user else "",
            "phone": user.phone if user else "",
            "email": user.email if user else "",
            "location": tech.location or "",
            "bio": tech.bio or "",
            "specialties": tech.specialties or [],
            "minPrice": tech.min_price,
            "warrantyDays": tech.warranty_days,
            "serviceRadius": tech.service_radius,
            "available": tech.available,
            "iprsVerified": tech.iprs_verified,
            "insured": tech.insured,
            "rating": tech.rating,
            "reviewCount": tech.review_count,
            "joinedAt": tech.joined_at,
        },
        "incoming": [map_incoming_request(r) for r in incoming],
        "jobs": [map_active_job(j, db) for j in jobs],
        "completed": [map_completed_job(c) for c in completed],
        "earnings": {
            "this_month": sum(j.amount for j in this_month),
            "last_month": 0,
            "all_time": 0,
            "pending": 0,
            "jobs_this_month": len(this_month),
            "avg_job_value": sum(j.amount for j in this_month) / len(this_month) if this_month else 0,
            "completion_rate": 0,
        }
    }

@router.get("/dashboard", response_model=DashboardResponse)
async def get_dashboard_summary(
    user_id: int = None,
    db: Session = Depends(get_db),
    tech = Depends(require_technician)
):
    """Get technician dashboard summary."""
    # Incoming requests count
    incoming = db.query(RepairRequest).filter(
        RepairRequest.status == "open",
        RepairRequest.expires_at > datetime.utcnow()
    ).count()
    
    # Active jobs count
    active_jobs = db.query(ActiveJob).filter(
        ActiveJob.technician_id == tech.id,
        ActiveJob.status.notin_(["completed", "declined", "cancelled"])
    ).count()
    
    # Earnings calculations
    thirty_days_ago = datetime.utcnow() - timedelta(days=30)
    this_month = db.query(CompletedJob).filter(
        CompletedJob.technician_id == tech.id,
        CompletedJob.completed_at >= thirty_days_ago,
        CompletedJob.payout_status == PayoutStatusEnum.paid
    ).all()
    
    this_month_total = sum(j.amount for j in this_month)
    avg_job = this_month_total / len(this_month) if this_month else 0
    completion_rate = int((len(this_month) / (len(this_month) + 2)) * 100) if this_month else 0
    
    return DashboardResponse(
        profile=TechnicianProfileResponse(
            id=tech.id,
            name=str(tech.user_id),
            phone="",
            email="",
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
        ),
        incoming_count=incoming,
        active_jobs_count=active_jobs,
        earnings=EarningsResponse(
            this_month=this_month_total,
            last_month=0,
            all_time=0,
            pending=0,
            jobs_this_month=len(this_month),
            avg_job_value=avg_job,
            completion_rate=completion_rate,
        ),
    )