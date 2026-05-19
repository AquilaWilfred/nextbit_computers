# routers/technician/utils/mappers.py
from sqlalchemy.orm import Session
from models.technician import RepairRequest, ActiveJob, CompletedJob, QuoteLineItem
from schemas.technician.response import IncomingRequestResponse, ActiveJobResponse, QuoteLineItemResponse, CompletedJobResponse

def map_incoming_request(request: RepairRequest) -> dict:
    """Convert RepairRequest to dict with null safety."""
    return {
        "id": request.id,
        "customerId": request.customer_id if request.customer_id is not None else None,
        "customerName": request.customer_name or "Guest",
        "customerPhone": request.customer_phone or "",
        "device": request.device or "",
        "brand": request.brand or "",
        "issue": request.issue or "",
        "urgency": request.urgency.value if request.urgency else "medium",
        "budget": float(request.budget) if request.budget else 0,
        "location": request.location or "",
        "distanceKm": float(request.distance_km) if hasattr(request, 'distance_km') and request.distance_km else 0,
        "serviceMode": request.service_mode.value if request.service_mode else "drop_off",
        "partsPreference": request.parts_preference.value if request.parts_preference else "tech_choice",
        "photoUrls": request.photo_urls or [],
        "postedAt": request.posted_at,
        "expiresAt": request.expires_at,
    }

def map_active_job(job: ActiveJob, db: Session) -> dict:
    """Convert ActiveJob to dict with null safety."""
    line_items = db.query(QuoteLineItem).filter(QuoteLineItem.job_id == job.id).all()
    
    return {
        "id": job.id,
        "requestId": job.request_id,
        "customerId": job.customer_id,
        "customerName": job.customer_name or "Unknown Customer",
        "customerPhone": job.customer_phone or "",
        "device": job.device or "",
        "brand": job.brand or "",
        "issue": job.issue or "",
        "status": job.status.value if job.status else "new_request",
        "urgency": job.urgency.value if job.urgency else "medium",
        "serviceMode": job.service_mode.value if job.service_mode else "drop_off",
        "location": job.location or "",
        "quotedAmount": float(job.quoted_amount) if job.quoted_amount else 0,
        "quoteLineItems": [
            {
                "id": li.id,
                "description": li.description or "",
                "amount": float(li.amount) if li.amount else 0
            }
            for li in line_items
        ],
        "partsOrdered": job.parts_ordered or False,
        "partsCost": float(job.parts_cost) if job.parts_cost else 0,
        "startedAt": job.started_at,
        "completedAt": job.completed_at,
        "warrantyDays": job.warranty_days or 30,
        "notes": job.notes or "",
        "progressPercent": job.progress_percent or 0,
    }

def map_completed_job(job: CompletedJob) -> dict:
    """Convert CompletedJob to dict with null safety."""
    return {
        "id": job.id,
        "customerName": job.customer_name or "Customer",
        "device": job.device or "",
        "issue": job.issue or "",
        "amount": float(job.amount) if job.amount else 0,
        "payoutStatus": job.payout_status.value if hasattr(job.payout_status, "value") else str(job.payout_status),
        "completedAt": job.completed_at,
        "customerRating": job.customer_rating,
        "customerReview": job.customer_review,
        "warrantyExpiry": job.warranty_expiry,
    }