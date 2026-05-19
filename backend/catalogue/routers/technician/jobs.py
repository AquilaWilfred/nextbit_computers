# routers/technician/endpoints/jobs.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime
from db.postgres import get_db
from models.technician import ActiveJob, JobStatusEnum
from dependencies.auth import require_technician
from schemas.technician.request import UpdateJobStatusRequest
from schemas.technician.response import ActiveJobResponse
from utils.technician.mappers import map_active_job

router = APIRouter()

@router.get("/jobs", response_model=list[ActiveJobResponse])
async def get_active_jobs(
    user_id: int = None,
    db: Session = Depends(get_db),
    tech = Depends(require_technician)
):
    """Get all active jobs for technician."""
    jobs = db.query(ActiveJob).filter(
        ActiveJob.technician_id == tech.id,
        ActiveJob.status.notin_(["completed", "declined", "cancelled"])
    ).all()
    
    return [map_active_job(j, db) for j in jobs]

@router.patch("/jobs/{job_id}/status")
async def update_job_status(
    job_id: int,
    status_update: UpdateJobStatusRequest,
    user_id: int = None,
    db: Session = Depends(get_db),
    tech = Depends(require_technician)
):
    """Update job status in lifecycle."""
    job = db.query(ActiveJob).filter(ActiveJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    if job.technician_id != tech.id:
        raise HTTPException(status_code=403, detail="Forbidden")
    
    try:
        job.status = JobStatusEnum[status_update.status]
    except KeyError:
        raise HTTPException(status_code=400, detail="Invalid status")
    
    # Update progress
    status_map = {
        "quote_accepted": 20,
        "diagnosed": 40,
        "parts_ordered": 60,
        "in_repair": 80,
        "ready": 90,
        "completed": 100,
    }
    job.progress_percent = status_map.get(status_update.status, job.progress_percent)
    
    if status_update.status == "completed":
        job.completed_at = datetime.utcnow()
    
    if not job.started_at:
        job.started_at = datetime.utcnow()
    
    db.commit()
    
    return {"status": job.status.value}