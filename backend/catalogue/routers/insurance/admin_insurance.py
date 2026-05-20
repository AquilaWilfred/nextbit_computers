from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from db.postgres import get_db
from routers.auth import require_role
from models.auth import User
from models.insurance.insurance import (
    InsurancePolicy, InsuranceClaim, InsuranceProduct, InsuranceStats,
    PolicyStatus, ClaimStatus, InsuranceType
)
from schemas.insurance.insurance import (
    AdminStatsResponse, InsurancePolicyResponse, InsuranceClaimResponse,
    ClaimReviewRequest
)

router = APIRouter(prefix="/api/admin/insurance", tags=["admin-insurance"])


# ========== Statistics ==========
@router.get("/stats", response_model=AdminStatsResponse)
def get_admin_stats(
    current_user: User = Depends(require_role(["admin", "agent"])),
    db: Session = Depends(get_db)
):
    """Get insurance admin dashboard statistics"""
    
    policies = db.query(InsurancePolicy).all()
    claims = db.query(InsuranceClaim).all()
    unique_clients = set(p.user_id for p in policies)
    
    total_policies = len(policies)
    active_policies = sum(1 for p in policies if p.status == PolicyStatus.ACTIVE)
    expired_policies = sum(1 for p in policies if p.status == PolicyStatus.EXPIRED)
    claimed_policies = sum(1 for p in policies if p.status == PolicyStatus.CLAIMED)
    transit_policies = sum(1 for p in policies if p.type == InsuranceType.GOODS_IN_TRANSIT)
    device_policies = sum(1 for p in policies if p.type == InsuranceType.DEVICE_PROTECTION)
    
    total_claims = len(claims)
    pending_claims = sum(1 for c in claims if c.status == ClaimStatus.PENDING)
    approved_claims = sum(1 for c in claims if c.status == ClaimStatus.APPROVED)
    rejected_claims = sum(1 for c in claims if c.status == ClaimStatus.REJECTED)
    
    total_coverage = sum(p.coverage_amount for p in policies)
    total_premiums = sum(p.premium_paid for p in policies)
    total_claims_approved = sum(c.amount_approved or c.amount_requested for c in claims if c.status == ClaimStatus.APPROVED)
    total_claims_pending = sum(c.amount_requested for c in claims if c.status == ClaimStatus.PENDING)
    
    return AdminStatsResponse(
        total_policies=total_policies,
        active_policies=active_policies,
        expired_policies=expired_policies,
        claimed_policies=claimed_policies,
        transit_policies=transit_policies,
        device_policies=device_policies,
        total_claims=total_claims,
        pending_claims=pending_claims,
        approved_claims=approved_claims,
        rejected_claims=rejected_claims,
        total_coverage=total_coverage,
        total_premiums_collected=total_premiums,
        total_claims_approved_amount=total_claims_approved,
        total_claims_pending_amount=total_claims_pending,
        total_clients=len(unique_clients),
    )


# ========== Policies Management ==========
@router.get("/policies", response_model=List[InsurancePolicyResponse])
def get_all_policies(
    current_user: User = Depends(require_role(["admin", "agent"])),
    db: Session = Depends(get_db),
    status: Optional[str] = None,
    policy_type: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = 100,
    offset: int = 0
):
    """Get all insurance policies with filters"""
    query = db.query(InsurancePolicy)
    
    if status:
        query = query.filter(InsurancePolicy.status == status)
    if policy_type:
        query = query.filter(InsurancePolicy.type == policy_type)
    if search:
        query = query.filter(
            (InsurancePolicy.policy_number.ilike(f"%{search}%"))
        )
    
    policies = query.order_by(InsurancePolicy.created_at.desc()).offset(offset).limit(limit).all()
    return policies


# ========== Claims Management ==========
@router.get("/claims", response_model=List[InsuranceClaimResponse])
def get_all_claims(
    current_user: User = Depends(require_role(["admin", "agent"])),
    db: Session = Depends(get_db),
    status: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = 100,
    offset: int = 0
):
    """Get all insurance claims with filters"""
    query = db.query(InsuranceClaim)
    
    if status:
        query = query.filter(InsuranceClaim.status == status)
    if search:
        query = query.filter(
            (InsuranceClaim.claim_number.ilike(f"%{search}%"))
        )
    
    claims = query.order_by(InsuranceClaim.created_at.desc()).offset(offset).limit(limit).all()
    return claims


@router.post("/claims/{claim_id}/review")
def review_claim(
    claim_id: int,
    data: ClaimReviewRequest,
    current_user: User = Depends(require_role(["admin", "agent"])),
    db: Session = Depends(get_db)
):
    """Review and process an insurance claim"""
    
    claim = db.query(InsuranceClaim).filter(InsuranceClaim.id == claim_id).first()
    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found")
    
    if claim.status != ClaimStatus.PENDING:
        raise HTTPException(status_code=400, detail="Claim already reviewed")
    
    if data.action == "approved":
        claim.status = ClaimStatus.APPROVED
        claim.amount_approved = data.amount_approved or claim.amount_requested
        
        # Update policy status if needed
        policy = db.query(InsurancePolicy).filter(InsurancePolicy.id == claim.policy_id).first()
        if policy:
            policy.status = PolicyStatus.CLAIMED
        
    elif data.action == "rejected":
        claim.status = ClaimStatus.REJECTED
        claim.rejection_reason = data.rejection_reason
    else:
        raise HTTPException(status_code=400, detail="Invalid action")
    
    claim.reviewed_by = current_user.email
    claim.reviewed_at = datetime.now()
    
    db.commit()
    
    return {"success": True, "status": claim.status}


@router.get("/claims/{claim_id}", response_model=InsuranceClaimResponse)
def get_claim_detail_admin(
    claim_id: int,
    current_user: User = Depends(require_role(["admin", "agent"])),
    db: Session = Depends(get_db)
):
    """Get claim detail (admin view)"""
    claim = db.query(InsuranceClaim).filter(InsuranceClaim.id == claim_id).first()
    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found")
    return claim