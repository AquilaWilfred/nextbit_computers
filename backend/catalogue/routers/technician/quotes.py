# routers/technician/endpoints/quotes.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from db.postgres import get_db
from models.technician import RepairRequest, ActiveJob, QuoteLineItem, JobStatusEnum
from dependencies.auth import require_technician
from schemas.technician.request import SendQuoteRequest
from .ws.websocket_manager import ws_manager  # Import WebSocket manager

router = APIRouter()

@router.post("/quotes")
async def send_quote(
    quote_req: SendQuoteRequest,
    user_id: int = None,
    db: Session = Depends(get_db),
    tech = Depends(require_technician)
):
    """Send a quote to customer for a repair request."""
    request = db.query(RepairRequest).filter(RepairRequest.id == quote_req.request_id).first()
    
    if not request:
        raise HTTPException(status_code=404, detail="Request not found")
    
    # Create active job
    total_amount = sum(li.amount for li in quote_req.line_items)
    
    job = ActiveJob(
        request_id=request.id,
        technician_id=tech.id,
        customer_id=request.customer_id,
        customer_name=request.customer_name,
        customer_phone=request.customer_phone,
        device=request.device,
        brand=request.brand,
        issue=request.issue,
        location=request.location,
        quoted_amount=total_amount,
        warranty_days=quote_req.warranty_days,
        status=JobStatusEnum.quote_sent,
        urgency=request.urgency,
        service_mode=request.service_mode,
        notes=quote_req.notes,
        progress_percent=10,
    )
    
    db.add(job)
    db.flush()
    
    # Add line items
    for li in quote_req.line_items:
        line_item = QuoteLineItem(
            job_id=job.id,
            description=li.description,
            amount=li.amount,
        )
        db.add(line_item)
    
    # Update request status
    request.status = "quote_sent"
    
    db.commit()
    db.refresh(job)
    
    # 🔥 Send real-time notification to customer
    if request.customer_id:
        await ws_manager.send_to_user(
            user_id=request.customer_id,
            event_type="quote_received",
            data={
                "request_id": request.id,
                "job_id": job.id,
                "total": total_amount,
                "status": "quote_sent",
                "message": f"You've received a quote of KES {total_amount:,.0f} for your {request.device}"
            }
        )
    
    return {
        "job_id": job.id, 
        "total": total_amount, 
        "request_id": request.id, 
        "status": "quote_sent"
    }