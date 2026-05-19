"""Public repairs and parts router.
Provides technician listings, spare parts, customer repair requests, and history.
"""

from datetime import datetime, timedelta
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, ConfigDict
from sqlalchemy.orm import Session

from db.postgres import get_db
from models.auth import User
from models.part import SparePart, PartConditionEnum
from models.technician import (
    PartsPreferenceEnum,
    RepairRequest,
    CompletedJob,
    ActiveJob,
    TechnicianProfile,
    RepairMessage,
    QuoteLineItem,
    PartsPreferenceEnum,
    ServiceModeEnum,
    UrgencyEnum,
    PayoutStatusEnum,
)

router = APIRouter()


class TechnicianSummaryResponse(BaseModel):
    id: int
    name: str
    initials: str
    avatarColor: str
    avatarTextColor: str
    verified: bool
    iprsVerified: bool
    available: bool
    rating: float
    reviewCount: int
    jobsCompleted: int
    distanceKm: float
    location: str
    specialties: List[str]
    minPrice: float
    maxPrice: float
    warrantyDays: int
    insured: bool
    responseTime: str
    bio: str


class SparePartResponse(BaseModel):
    id: int
    name: str
    compatibility: str
    price: float
    condition: PartConditionEnum
    category: str
    supplier: str
    stock: int
    warrantyDays: int
    available: bool


class RepairRequestCreate(BaseModel):
    device: str
    brand: Optional[str] = None
    issue: str
    urgency: UrgencyEnum
    budget: float
    location: str
    serviceMode: ServiceModeEnum
    partsPreference: PartsPreferenceEnum
    photoUrls: Optional[List[str]] = None
    customerName: Optional[str] = None
    customerPhone: Optional[str] = None


class RepairRequestResponse(BaseModel):
    id: int
    device: str
    brand: Optional[str]
    issue: str
    status: str
    urgency: str
    budget: float
    location: str
    serviceMode: str
    partsPreference: str
    photoUrls: List[str]
    quotesReceived: int
    lowestQuote: Optional[float]
    assignedTech: Optional[str]
    progressPercent: int
    createdAt: datetime


class MessageResponse(BaseModel):
    id: int
    job_id: int
    from_role: str
    from_user_id: int
    text: str
    sent_at: datetime

    model_config = ConfigDict(from_attributes=True)


class SendMessageRequest(BaseModel):
    text: str


class CompletedRepairResponse(BaseModel):
    id: int
    device: str
    issue: str
    technician: str
    cost: float
    completedDate: datetime
    userRating: int
    warrantyExpiry: datetime
    warrantyActive: bool
    paymentVerified: bool


class JobRatingRequest(BaseModel):
    rating: int
    review: Optional[str] = None


def get_customer_user(db: Session, user_id: Optional[int]) -> Optional[User]:
    if not user_id:
        return None
    return db.query(User).filter(User.id == user_id).first()


def map_status(raw_status: str) -> str:
    if raw_status == "open":
        return "pending"
    if raw_status == "quote_sent":
        return "quoted"
    if raw_status == "accepted":
        return "in_progress"
    return raw_status


def get_quote_summary(request: RepairRequest, db: Session):
    quote_jobs = db.query(ActiveJob).filter(
        ActiveJob.request_id == request.id,
        ActiveJob.status.notin_(["declined", "cancelled"])
    ).all()

    if not quote_jobs:
        return 0, None, None

    quotes_received = len(quote_jobs)
    lowest_quote = min((job.quoted_amount for job in quote_jobs if job.quoted_amount is not None), default=None)
    assigned_tech = None

    active_assignment = next(
        (job for job in quote_jobs if job.status != "quote_sent"),
        None,
    )
    if active_assignment and active_assignment.technician_id:
        technician = db.query(TechnicianProfile).filter(TechnicianProfile.id == active_assignment.technician_id).first()
        if technician:
            technician_user = db.query(User).filter(User.id == technician.user_id).first()
            assigned_tech = technician_user.name if technician_user else None

    return quotes_received, lowest_quote, assigned_tech


@router.get("/technicians", response_model=List[TechnicianSummaryResponse])
async def list_technicians(
    query: Optional[str] = Query(None),
    specialty: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    techs = db.query(TechnicianProfile).all()
    responses: List[TechnicianSummaryResponse] = []

    for tech in techs:
        user = db.query(User).filter(User.id == tech.user_id).first()
        completed_count = db.query(CompletedJob).filter(CompletedJob.technician_id == tech.id).count()
        name = user.name if user else f"Technician {tech.id}"
        initials = "".join([part[0].upper() for part in name.split() if part])[:2] or "TE"
        responses.append(
            TechnicianSummaryResponse(
                id=tech.id,
                name=name,
                initials=initials,
                avatarColor="#E1F5EE",
                avatarTextColor="#0F6E56",
                verified=True,
                iprsVerified=tech.iprs_verified,
                available=tech.available,
                rating=tech.rating if (tech.review_count or 0) > 0 else 0.0,
                reviewCount=tech.review_count or 0,
                jobsCompleted=completed_count,
                distanceKm=1.5,
                location=tech.location or "Nairobi",
                specialties=tech.specialties or [],
                minPrice=tech.min_price,
                maxPrice=max(tech.min_price * 3, tech.min_price),
                warrantyDays=tech.warranty_days,
                insured=tech.insured,
                responseTime="< 2 hrs",
                bio=tech.bio or "",
            )
        )

    if query:
        responses = [tech for tech in responses if query.lower() in tech.name.lower() or query.lower() in tech.location.lower()]
    if specialty:
        responses = [tech for tech in responses if specialty in tech.specialties]

    return responses


@router.get("/parts", response_model=List[SparePartResponse])
async def list_parts(db: Session = Depends(get_db)):
    parts = db.query(SparePart).filter(SparePart.available == True).all()
    return [
        SparePartResponse(
            id=part.id,
            name=part.name,
            compatibility=part.compatibility,
            price=part.price,
            condition=part.condition,
            category=part.category,
            supplier=part.supplier,
            stock=part.stock,
            warrantyDays=part.warranty_days,
            available=part.available,
        )
        for part in parts
    ]


@router.post("/requests", response_model=RepairRequestResponse)
async def create_request(
    request_data: RepairRequestCreate,
    user_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
):
    user = get_customer_user(db, user_id)

    customer_name = request_data.customerName or (user.name if user else "Guest Customer")
    customer_phone = request_data.customerPhone or (user.phone if user else "")
    customer_id = user.id if user else None

    request = RepairRequest(
        customer_id=user.id if user else None,
        customer_name=customer_name,
        customer_phone=customer_phone,
        device=request_data.device,
        brand=request_data.brand or "",
        issue=request_data.issue,
        urgency=request_data.urgency,
        budget=request_data.budget,
        location=request_data.location,
        distance_km=0.0,
        service_mode=request_data.serviceMode,
        parts_preference=request_data.partsPreference,
        photo_urls=request_data.photoUrls or [],
        expires_at=datetime.utcnow() + timedelta(hours=48),
        status="open",
    )

    db.add(request)
    db.commit()
    db.refresh(request)

    return RepairRequestResponse(
        id=request.id,
        device=request.device,
        brand=request.brand,
        issue=request.issue,
        status=map_status(request.status),
        urgency=request.urgency.value,
        budget=request.budget,
        location=request.location,
        serviceMode=request.service_mode.value,
        partsPreference=request.parts_preference.value,
        photoUrls=request.photo_urls or [],
        quotesReceived=0,
        lowestQuote=None,
        assignedTech=None,
        progressPercent=0,
        createdAt=request.posted_at,
    )


@router.get("/requests", response_model=List[RepairRequestResponse])
async def get_requests(
    user_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
):
    if user_id:
        requests = db.query(RepairRequest).filter(RepairRequest.customer_id == user_id).all()
    else:
        requests = []

    response = []
    for request in requests:
        quotes_received, lowest_quote, assigned_tech = get_quote_summary(request, db)
        response.append(
            RepairRequestResponse(
                id=request.id,
                device=request.device,
                brand=request.brand,
                issue=request.issue,
                status=map_status(request.status),
                urgency=request.urgency.value,
                budget=request.budget,
                location=request.location,
                serviceMode=request.service_mode.value,
                partsPreference=request.parts_preference.value,
                photoUrls=request.photo_urls or [],
                quotesReceived=quotes_received,
                lowestQuote=lowest_quote,
                assignedTech=assigned_tech,
                progressPercent=0,
                createdAt=request.posted_at,
            )
        )

    return response


@router.get("/history", response_model=List[CompletedRepairResponse])
async def get_history(
    user_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
):
    if not user_id:
        return []

    jobs = db.query(CompletedJob).filter(CompletedJob.customer_id == user_id).all()

    history: List[CompletedRepairResponse] = []
    for job in jobs:
        technician = db.query(TechnicianProfile).filter(TechnicianProfile.id == job.technician_id).first()
        technician_name = "Unknown Technician"
        if technician:
            user = db.query(User).filter(User.id == technician.user_id).first()
            technician_name = user.name if user else technician_name

        history.append(
            CompletedRepairResponse(
                id=job.id,
                device=job.device,
                issue=job.issue,
                technician=technician_name,
                cost=job.amount,
                completedDate=job.completed_at,
                userRating=job.customer_rating or 0,
                warrantyExpiry=job.warranty_expiry,
                warrantyActive=job.warranty_expiry >= datetime.utcnow() if job.warranty_expiry else False,
                paymentVerified=job.payout_status == PayoutStatusEnum.paid,
            )
        )

    return history


@router.post("/history/{job_id}/rating", response_model=CompletedRepairResponse)
async def rate_completed_job(
    job_id: int,
    rating_data: JobRatingRequest,
    user_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
):
    if not user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")

    job = db.query(CompletedJob).filter(
        CompletedJob.id == job_id,
        CompletedJob.customer_id == user_id,
    ).first()

    if not job:
        raise HTTPException(status_code=404, detail="Completed job not found")

    if job.payout_status != PayoutStatusEnum.paid:
        raise HTTPException(status_code=400, detail="Payment must be verified before rating the technician")

    if not job.completed_at:
        raise HTTPException(status_code=400, detail="Job must be completed before rating")

    if job.customer_rating is not None:
        raise HTTPException(status_code=400, detail="This job has already been rated")

    if rating_data.rating < 1 or rating_data.rating > 5:
        raise HTTPException(status_code=400, detail="Rating must be between 1 and 5")

    job.customer_rating = rating_data.rating
    job.customer_review = rating_data.review

    technician = db.query(TechnicianProfile).filter(TechnicianProfile.id == job.technician_id).first()
    if technician:
        total_rating = (technician.rating or 0.0) * (technician.review_count or 0)
        technician.review_count = (technician.review_count or 0) + 1
        technician.rating = (total_rating + rating_data.rating) / technician.review_count

    db.commit()
    db.refresh(job)
    if technician:
        db.refresh(technician)

    technician_name = "Unknown Technician"
    if technician:
        user = db.query(User).filter(User.id == technician.user_id).first()
        technician_name = user.name if user else technician_name

    return CompletedRepairResponse(
        id=job.id,
        device=job.device,
        issue=job.issue,
        technician=technician_name,
        cost=job.amount,
        completedDate=job.completed_at,
        userRating=job.customer_rating or 0,
        warrantyExpiry=job.warranty_expiry,
        warrantyActive=job.warranty_expiry >= datetime.utcnow() if job.warranty_expiry else False,
        paymentVerified=job.payout_status == PayoutStatusEnum.paid,
    )


# ────────────────────────────────────────────────────────────────────────────
# Messaging Endpoints (Customer-Technician Chat)
# ────────────────────────────────────────────────────────────────────────────

@router.get("/requests/{request_id}/messages", response_model=List[MessageResponse])
async def get_request_messages(
    request_id: int,
    user_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
):
    """Get all messages for a repair request (customer view)."""
    if not user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")

    # Verify customer owns this request
    request = db.query(RepairRequest).filter(
        RepairRequest.id == request_id,
        RepairRequest.customer_id == user_id,
    ).first()

    if not request:
        raise HTTPException(status_code=404, detail="Request not found")

    # Get the active job for this request
    job = db.query(ActiveJob).filter(ActiveJob.request_id == request_id).first()
    
    if not job:
        # No active job yet, return empty list
        return []

    # Get all messages for this job
    messages = db.query(RepairMessage).filter(
        RepairMessage.job_id == job.id
    ).order_by(RepairMessage.sent_at).all()

    return [MessageResponse.from_orm(m) for m in messages]


@router.post("/requests/{request_id}/messages", response_model=MessageResponse)
async def send_request_message(
    request_id: int,
    msg_req: SendMessageRequest,
    user_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
):
    """Send a message on a repair request (customer to technician)."""
    if not user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")

    # Verify customer owns this request
    request = db.query(RepairRequest).filter(
        RepairRequest.id == request_id,
        RepairRequest.customer_id == user_id,
    ).first()

    if not request:
        raise HTTPException(status_code=404, detail="Request not found")

    # Get the active job for this request
    job = db.query(ActiveJob).filter(ActiveJob.request_id == request_id).first()
    
    if not job:
        raise HTTPException(status_code=400, detail="No active job assigned to this request")

    # Create message from customer
    message = RepairMessage(
        job_id=job.id,
        from_user_id=user_id,
        from_role="customer",
        text=msg_req.text,
    )

    db.add(message)
    db.commit()
    db.refresh(message)

    return MessageResponse.from_orm(message)

# routers/repairs.py - Add this new endpoint

@router.get("/requests/{request_id}/quote")
async def get_request_quote(
    request_id: int,
    user_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
):
    """Get the quote for a specific repair request."""
    if not user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    # Verify customer owns this request
    request = db.query(RepairRequest).filter(
        RepairRequest.id == request_id,
        RepairRequest.customer_id == user_id,
    ).first()
    
    if not request:
        raise HTTPException(status_code=404, detail="Request not found")
    
    # Get the active job for this request
    job = db.query(ActiveJob).filter(
        ActiveJob.request_id == request_id
    ).first()
    
    if not job:
        raise HTTPException(status_code=404, detail="No quote found for this request")
    
    # Get technician name
    technician = db.query(TechnicianProfile).filter(TechnicianProfile.id == job.technician_id).first()
    technician_name = "Technician"
    if technician:
        user = db.query(User).filter(User.id == technician.user_id).first()
        technician_name = user.name if user else technician_name
    
    # Get line items
    line_items = db.query(QuoteLineItem).filter(QuoteLineItem.job_id == job.id).all()
    
    return {
        "job_id": job.id,
        "technician_name": technician_name,
        "total": job.quoted_amount,
        "line_items": [
            {"id": li.id, "description": li.description, "amount": li.amount}
            for li in line_items
        ],
        "warranty_days": job.warranty_days,
        "notes": job.notes or "",
        "status": job.status.value if job.status else "unknown",
        "created_at": job.created_at,
    }

# routers/repairs.py - Add this endpoint

@router.post("/requests/{request_id}/accept-quote")
async def accept_quote(
    request_id: int,
    user_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
):
    """Accept a quote for a repair request."""
    if not user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    # Verify customer owns this request
    request = db.query(RepairRequest).filter(
        RepairRequest.id == request_id,
        RepairRequest.customer_id == user_id,
    ).first()
    
    if not request:
        raise HTTPException(status_code=404, detail="Request not found")
    
    # Get the active job
    job = db.query(ActiveJob).filter(
        ActiveJob.request_id == request_id,
        ActiveJob.status == "quote_sent"
    ).first()
    
    if not job:
        raise HTTPException(status_code=404, detail="No quote found for this request")
    
    # Update job status to accepted
    from models.technician import JobStatusEnum
    job.status = JobStatusEnum.quote_accepted
    job.progress_percent = 20
    
    # Update request status
    request.status = "accepted"
    
    db.commit()
    db.refresh(job)
    
    # Send WebSocket notification to technician
    try:
        from .technician.ws.websocket_manager import ws_manager
        await ws_manager.send_to_user(
            user_id=job.technician_id,
            event_type="quote_accepted",
            data={
                "request_id": request_id,
                "job_id": job.id,
                "message": f"Customer accepted your quote for {request.device}"
            }
        )
    except:
        pass  # WebSocket not available
    
    return {"status": "accepted", "job_id": job.id}