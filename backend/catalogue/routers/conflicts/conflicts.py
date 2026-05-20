from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime, timedelta
import random
import string

from db.postgres import get_db
from routers.auth import get_current_user, require_role
from models.auth import User
from models.conflicts.conflicts import (
    ConflictReport, ConflictStatus, ConflictPriority, 
    ResolutionStatus, TimelineEventType
)
from schemas.conflicts.conflicts import (
    ConflictReportCreate, ConflictReportUpdate, ConflictReportResponse,
    MessageCreate, EscalateRequest, ResolutionProposal, 
    ResolutionRejectRequest, SatisfactionRating, SlaOverrideRequest,
    TimelineEvent, Attachment
)

router = APIRouter(prefix="/api/conflicts", tags=["conflicts"])


# Helper: display name for a user (backwards-compatible with different User schemas)
def user_display_name(user):
    return getattr(user, "full_name", None) or getattr(user, "name", None) or getattr(user, "email", None)


# Ensure a ConflictReport has an `updated_at` value for response validation
def ensure_updated_at(conflict):
    if getattr(conflict, "updated_at", None) is None:
        conflict.updated_at = getattr(conflict, "created_at", None)

# Helper: Generate reference number
def generate_reference_number():
    year = datetime.now().year
    random_num = ''.join(random.choices(string.digits, k=5))
    return f"CR-{year}-{random_num}"

# Helper: Add timeline event
def add_timeline_event(db: Session, conflict_id: int, event_data: dict):
    conflict = db.query(ConflictReport).filter(ConflictReport.id == conflict_id).first()
    if conflict:
        timeline = conflict.timeline or []
        timeline.append(event_data)
        conflict.timeline = timeline
        conflict.updated_at = datetime.now()
        db.commit()

# ========== CUSTOMER ENDPOINTS ==========

@router.post("", response_model=ConflictReportResponse)
def create_conflict(
    data: ConflictReportCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Customer creates a new conflict report"""
    
    sla_hours = {
        "urgent": 2,
        "high": 4,
        "medium": 24,
        "low": 72
    }
    
    sla_deadline = datetime.now() + timedelta(hours=sla_hours[data.priority.value])
    
    conflict = ConflictReport(
        reference_number=generate_reference_number(),
        type=data.type,
        title=data.title,
        description=data.description,
        priority=data.priority,
        status=ConflictStatus.PENDING,
        customer_id=current_user.id,
        customer_name=user_display_name(current_user),
        customer_email=current_user.email,
        reference_id=data.reference_id,
        reference_type=data.reference_type,
        sla_deadline=sla_deadline,
        attachments=[att.dict() for att in data.attachments] if data.attachments else [],
        timeline=[
            {
                "id": f"t{int(datetime.now().timestamp())}",
                "timestamp": datetime.now().isoformat(),
                "actor": "user",
                "actor_name": user_display_name(current_user) or "Customer",
                "type": "message",
                "content": data.description,
                "attachments": [att.dict() for att in data.attachments] if data.attachments else None
            },
            {
                "id": f"t{int(datetime.now().timestamp()) + 1}",
                "timestamp": datetime.now().isoformat(),
                "actor": "system",
                "actor_name": "System",
                "type": "status_change",
                "content": "Conflict report submitted. SLA timer started.",
                "attachments": None
            }
        ]
    )
    # Set initial updated_at so response validation (which expects a datetime) succeeds
    conflict.updated_at = datetime.now()
    
    db.add(conflict)
    db.commit()
    db.refresh(conflict)
    
    return conflict

@router.get("", response_model=List[ConflictReportResponse])
def get_my_conflicts(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    status: str = None,
    priority: str = None,
    limit: int = 50,
    offset: int = 0
):
    """Get customer's own conflict reports"""
    
    query = db.query(ConflictReport).filter(ConflictReport.customer_id == current_user.id)
    
    if status:
        query = query.filter(ConflictReport.status == status)
    if priority:
        query = query.filter(ConflictReport.priority == priority)
    
    conflicts = query.order_by(ConflictReport.created_at.desc()).offset(offset).limit(limit).all()
    for c in conflicts:
        ensure_updated_at(c)
    return conflicts

@router.get("/{conflict_id}", response_model=ConflictReportResponse)
def get_conflict_detail(
    conflict_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get single conflict report detail"""
    
    conflict = db.query(ConflictReport).filter(ConflictReport.id == conflict_id).first()
    if not conflict:
        raise HTTPException(status_code=404, detail="Conflict report not found")
    
    # Check permission: customer can only see their own
    if current_user.role == "customer" and conflict.customer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    ensure_updated_at(conflict)
    return conflict

@router.post("/{conflict_id}/messages")
def add_message(
    conflict_id: int,
    data: MessageCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Add a message to a conflict report"""
    
    conflict = db.query(ConflictReport).filter(ConflictReport.id == conflict_id).first()
    if not conflict:
        raise HTTPException(status_code=404, detail="Conflict report not found")
    
    # Permission check
    if current_user.role == "customer" and conflict.customer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    event = {
        "id": f"t{int(datetime.now().timestamp())}",
        "timestamp": datetime.now().isoformat(),
        "actor": "customer" if current_user.role == "customer" else "agent",
        "actor_name": user_display_name(current_user),
        "type": "attachment" if data.attachments else "message",
        "content": data.text or f"Attached {len(data.attachments)} file(s).",
        "attachments": [att.dict() for att in data.attachments] if data.attachments else None
    }
    
    timeline = conflict.timeline or []
    timeline.append(event)
    conflict.timeline = timeline
    conflict.updated_at = datetime.now()
    
    if data.attachments:
        existing_attachments = conflict.attachments or []
        conflict.attachments = existing_attachments + [att.dict() for att in data.attachments]
    
    db.commit()
    
    return {"success": True}

@router.post("/{conflict_id}/escalate")
def escalate_conflict(
    conflict_id: int,
    data: EscalateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Customer escalates a conflict report"""
    
    conflict = db.query(ConflictReport).filter(ConflictReport.id == conflict_id).first()
    if not conflict:
        raise HTTPException(status_code=404, detail="Conflict report not found")
    
    if conflict.customer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    if conflict.status == ConflictStatus.RESOLVED:
        raise HTTPException(status_code=400, detail="Cannot escalate a resolved conflict")
    
    conflict.status = ConflictStatus.ESCALATED
    conflict.updated_at = datetime.now()
    
    event = {
        "id": f"t{int(datetime.now().timestamp())}",
        "timestamp": datetime.now().isoformat(),
        "actor": "customer",
        "actor_name": user_display_name(current_user),
        "type": "escalation",
        "content": f"Escalation requested: {data.reason}",
        "attachments": None
    }
    
    timeline = conflict.timeline or []
    timeline.append(event)
    conflict.timeline = timeline
    
    db.commit()
    
    return {"success": True}

@router.post("/{conflict_id}/resolution/accept")
def accept_resolution(
    conflict_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Customer accepts proposed resolution"""
    
    conflict = db.query(ConflictReport).filter(ConflictReport.id == conflict_id).first()
    if not conflict:
        raise HTTPException(status_code=404, detail="Conflict report not found")
    
    if conflict.customer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    if conflict.resolution_status != ResolutionStatus.PENDING_ACCEPTANCE:
        raise HTTPException(status_code=400, detail="No resolution pending acceptance")
    
    conflict.status = ConflictStatus.RESOLVED
    conflict.resolution_status = ResolutionStatus.ACCEPTED
    conflict.updated_at = datetime.now()
    
    event = {
        "id": f"t{int(datetime.now().timestamp())}",
        "timestamp": datetime.now().isoformat(),
        "actor": "customer",
        "actor_name": user_display_name(current_user),
        "type": "resolution_accepted",
        "content": "Resolution accepted by customer.",
        "attachments": None
    }
    
    timeline = conflict.timeline or []
    timeline.append(event)
    conflict.timeline = timeline
    
    db.commit()
    
    return {"success": True}

@router.post("/{conflict_id}/resolution/reject")
def reject_resolution(
    conflict_id: int,
    data: ResolutionRejectRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Customer rejects proposed resolution"""
    
    conflict = db.query(ConflictReport).filter(ConflictReport.id == conflict_id).first()
    if not conflict:
        raise HTTPException(status_code=404, detail="Conflict report not found")
    
    if conflict.customer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    if conflict.resolution_status != ResolutionStatus.PENDING_ACCEPTANCE:
        raise HTTPException(status_code=400, detail="No resolution pending acceptance")
    
    conflict.status = ConflictStatus.INVESTIGATING
    conflict.resolution_status = ResolutionStatus.REJECTED
    conflict.updated_at = datetime.now()
    
    event = {
        "id": f"t{int(datetime.now().timestamp())}",
        "timestamp": datetime.now().isoformat(),
        "actor": "customer",
        "actor_name": user_display_name(current_user),
        "type": "resolution_rejected",
        "content": f"Resolution rejected: {data.reason}",
        "attachments": None
    }
    
    timeline = conflict.timeline or []
    timeline.append(event)
    conflict.timeline = timeline
    
    db.commit()
    
    return {"success": True}

@router.post("/{conflict_id}/satisfaction")
def submit_satisfaction(
    conflict_id: int,
    data: SatisfactionRating,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Customer submits satisfaction rating after resolution"""
    
    conflict = db.query(ConflictReport).filter(ConflictReport.id == conflict_id).first()
    if not conflict:
        raise HTTPException(status_code=404, detail="Conflict report not found")
    
    if conflict.customer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    if conflict.status != ConflictStatus.RESOLVED:
        raise HTTPException(status_code=400, detail="Can only rate resolved conflicts")
    
    conflict.satisfaction_rating = data.rating
    conflict.satisfaction_comment = data.comment
    conflict.updated_at = datetime.now()
    
    db.commit()
    
    return {"success": True}

# ========== ADMIN ENDPOINTS ==========

@router.get("/admin/all", response_model=List[ConflictReportResponse])
def get_all_conflicts(
    current_user: User = Depends(require_role(["admin", "agent"])),
    db: Session = Depends(get_db),
    status: str = None,
    priority: str = None,
    assigned_agent_id: int = None,
    limit: int = 100,
    offset: int = 0
):
    """Admin/Agent: Get all conflict reports"""
    
    query = db.query(ConflictReport)
    
    if status:
        query = query.filter(ConflictReport.status == status)
    if priority:
        query = query.filter(ConflictReport.priority == priority)
    if assigned_agent_id:
        query = query.filter(ConflictReport.assigned_agent_id == assigned_agent_id)
    
    conflicts = query.order_by(
        (ConflictReport.status == ConflictStatus.ESCALATED).desc(),
        (ConflictReport.priority == ConflictPriority.URGENT).desc(),
        ConflictReport.sla_deadline.asc()
    ).offset(offset).limit(limit).all()
    for c in conflicts:
        ensure_updated_at(c)

    return conflicts

@router.patch("/admin/{conflict_id}", response_model=ConflictReportResponse)
def update_conflict(
    conflict_id: int,
    data: ConflictReportUpdate,
    current_user: User = Depends(require_role(["admin", "agent"])),
    db: Session = Depends(get_db)
):
    """Admin/Agent: Update conflict report"""
    
    conflict = db.query(ConflictReport).filter(ConflictReport.id == conflict_id).first()
    if not conflict:
        raise HTTPException(status_code=404, detail="Conflict report not found")
    
    updates = data.dict(exclude_unset=True)
    
    # Track status change for timeline
    if "status" in updates and updates["status"] != conflict.status:
        event = {
            "id": f"t{int(datetime.now().timestamp())}",
            "timestamp": datetime.now().isoformat(),
            "actor": "agent",
            "actor_name": user_display_name(current_user),
            "type": "status_change",
            "content": f"Status changed to {updates['status'].value}.",
            "attachments": None
        }
        timeline = conflict.timeline or []
        timeline.append(event)
        conflict.timeline = timeline
    
    # Track agent assignment
    if "assigned_agent_name" in updates and updates["assigned_agent_name"] != conflict.assigned_agent_name:
        event = {
            "id": f"t{int(datetime.now().timestamp())}",
            "timestamp": datetime.now().isoformat(),
            "actor": "system",
            "actor_name": "System",
            "type": "agent_assigned",
            "content": f"Case assigned to {updates['assigned_agent_name']}.",
            "attachments": None
        }
        timeline = conflict.timeline or []
        timeline.append(event)
        conflict.timeline = timeline
    
    for key, value in updates.items():
        setattr(conflict, key, value)
    
    conflict.updated_at = datetime.now()
    db.commit()
    db.refresh(conflict)
    
    return conflict

@router.post("/admin/{conflict_id}/messages")
def admin_add_message(
    conflict_id: int,
    data: MessageCreate,
    current_user: User = Depends(require_role(["admin", "agent"])),
    db: Session = Depends(get_db)
):
    """Admin/Agent: Add message to conflict"""
    
    conflict = db.query(ConflictReport).filter(ConflictReport.id == conflict_id).first()
    if not conflict:
        raise HTTPException(status_code=404, detail="Conflict report not found")
    
    event = {
        "id": f"t{int(datetime.now().timestamp())}",
        "timestamp": datetime.now().isoformat(),
        "actor": "agent",
        "actor_name": user_display_name(current_user),
        "type": "attachment" if data.attachments else "message",
        "content": data.text or f"Attached {len(data.attachments)} file(s).",
        "attachments": [att.dict() for att in data.attachments] if data.attachments else None
    }
    
    timeline = conflict.timeline or []
    timeline.append(event)
    conflict.timeline = timeline
    conflict.updated_at = datetime.now()
    
    if data.attachments:
        existing_attachments = conflict.attachments or []
        conflict.attachments = existing_attachments + [att.dict() for att in data.attachments]
    
    db.commit()
    
    return {"success": True}

@router.post("/admin/{conflict_id}/resolution")
def propose_resolution(
    conflict_id: int,
    data: ResolutionProposal,
    current_user: User = Depends(require_role(["admin", "agent"])),
    db: Session = Depends(get_db)
):
    """Admin/Agent: Propose resolution to customer"""
    
    conflict = db.query(ConflictReport).filter(ConflictReport.id == conflict_id).first()
    if not conflict:
        raise HTTPException(status_code=404, detail="Conflict report not found")
    
    conflict.resolution = data.text
    conflict.resolution_status = ResolutionStatus.PENDING_ACCEPTANCE
    conflict.updated_at = datetime.now()
    
    event = {
        "id": f"t{int(datetime.now().timestamp())}",
        "timestamp": datetime.now().isoformat(),
        "actor": "agent",
        "actor_name": user_display_name(current_user),
        "type": "resolution_proposed",
        "content": f"Resolution proposed: {data.text}",
        "attachments": None
    }
    
    timeline = conflict.timeline or []
    timeline.append(event)
    conflict.timeline = timeline
    
    db.commit()
    
    return {"success": True}

@router.post("/admin/{conflict_id}/sla-override")
def override_sla(
    conflict_id: int,
    data: SlaOverrideRequest,
    current_user: User = Depends(require_role(["admin", "agent"])),
    db: Session = Depends(get_db)
):
    """Admin/Agent: Override SLA deadline"""
    
    conflict = db.query(ConflictReport).filter(ConflictReport.id == conflict_id).first()
    if not conflict:
        raise HTTPException(status_code=404, detail="Conflict report not found")
    
    conflict.sla_deadline = datetime.now() + timedelta(hours=data.hours)
    conflict.sla_overridden_at = datetime.now()
    conflict.sla_overridden_by = user_display_name(current_user)
    conflict.updated_at = datetime.now()
    
    event = {
        "id": f"t{int(datetime.now().timestamp())}",
        "timestamp": datetime.now().isoformat(),
        "actor": "agent",
        "actor_name": user_display_name(current_user),
        "type": "sla_override",
        "content": f"SLA deadline extended by {data.hours} hours.",
        "attachments": None
    }
    
    timeline = conflict.timeline or []
    timeline.append(event)
    conflict.timeline = timeline
    
    db.commit()
    
    return {"success": True}