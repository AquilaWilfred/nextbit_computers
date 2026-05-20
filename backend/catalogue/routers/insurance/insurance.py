from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from db.postgres import get_db
from routers.auth import get_current_user
from models.auth import User
from models.insurance.insurance import (
    InsuranceProduct, InsurancePolicy, InsuranceClaim, InsuranceStats,
    InsuranceType, PolicyStatus, ClaimStatus
)
from schemas.insurance.insurance import (
    InsuranceProductResponse, InsurancePolicyResponse, InsurancePolicyCreate,
    InsuranceClaimCreate, InsuranceClaimResponse, UserInsuranceStatsResponse
)
from utils.insurance.insurance_utils import (
    get_product_details, generate_policy_number, generate_claim_number,
    calculate_expiry_date, seed_insurance_products
)

router = APIRouter(prefix="/api/insurance", tags=["insurance"])


# ========== Helper Functions ==========
def get_or_create_stats(db: Session, user_id: int) -> InsuranceStats:
    stats = db.query(InsuranceStats).filter(InsuranceStats.user_id == user_id).first()
    if not stats:
        stats = InsuranceStats(user_id=user_id)
        db.add(stats)
        db.commit()
        db.refresh(stats)
    return stats


def update_user_stats(db: Session, user_id: int, policy: InsurancePolicy = None, claim: InsuranceClaim = None):
    stats = get_or_create_stats(db, user_id)
    
    if policy:
        stats.total_policies += 1
        stats.active_policies += 1 if policy.status == PolicyStatus.ACTIVE else 0
        stats.total_coverage += policy.coverage_amount
        stats.total_premiums_paid += policy.premium_paid
    
    if claim:
        stats.total_claims += 1
        if claim.status == ClaimStatus.APPROVED:
            stats.approved_claims += 1
    
    db.commit()


# ========== Products Endpoints ==========
@router.get("/products", response_model=List[InsuranceProductResponse])
def get_insurance_products(
    db: Session = Depends(get_db)
):
    """Get all available insurance products"""
    seed_insurance_products(db)
    products = db.query(InsuranceProduct).filter(InsuranceProduct.active == True).all()
    return products


# ========== Policy Endpoints ==========
@router.post("/policies", response_model=InsurancePolicyResponse)
def purchase_insurance_policy(
    data: InsurancePolicyCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Purchase an insurance policy"""
    
    product = get_product_details(data.type)
    expiry_date = calculate_expiry_date(data.type)
    
    policy = InsurancePolicy(
        policy_number=generate_policy_number(),
        user_id=current_user.id,
        type=data.type,
        coverage_amount=product["coverage_amount"],
        premium_paid=product["premium_amount"],
        start_date=datetime.now(),
        expiry_date=expiry_date,
        order_id=data.order_id,
        device_serial=data.device_serial,
        device_brand=data.device_brand,
        device_model=data.device_model,
    )
    
    db.add(policy)
    db.commit()
    db.refresh(policy)
    
    update_user_stats(db, current_user.id, policy=policy)
    
    return policy


@router.get("/policies", response_model=List[InsurancePolicyResponse])
def get_my_policies(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    status: Optional[str] = None,
    limit: int = 50,
    offset: int = 0
):
    """Get user's insurance policies"""
    query = db.query(InsurancePolicy).filter(InsurancePolicy.user_id == current_user.id)
    if status:
        query = query.filter(InsurancePolicy.status == status)
    policies = query.order_by(InsurancePolicy.created_at.desc()).offset(offset).limit(limit).all()
    return policies


@router.get("/policies/{policy_id}", response_model=InsurancePolicyResponse)
def get_policy_detail(
    policy_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific policy detail"""
    policy = db.query(InsurancePolicy).filter(InsurancePolicy.id == policy_id).first()
    if not policy:
        raise HTTPException(status_code=404, detail="Policy not found")
    if policy.user_id != current_user.id and current_user.role not in ["admin", "agent"]:
        raise HTTPException(status_code=403, detail="Access denied")
    return policy


# ========== Claim Endpoints ==========
@router.post("/claims", response_model=InsuranceClaimResponse)
def file_insurance_claim(
    data: InsuranceClaimCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """File an insurance claim"""
    
    policy = db.query(InsurancePolicy).filter(InsurancePolicy.id == data.policy_id).first()
    if not policy:
        raise HTTPException(status_code=404, detail="Policy not found")
    if policy.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    if policy.status != PolicyStatus.ACTIVE:
        raise HTTPException(status_code=400, detail="Policy is not active")
    
    # Validate claim amount doesn't exceed coverage
    if data.amount > policy.coverage_amount:
        raise HTTPException(status_code=400, detail=f"Claim amount cannot exceed coverage of KES {policy.coverage_amount}")
    
    claim = InsuranceClaim(
        claim_number=generate_claim_number(),
        policy_id=policy.id,
        user_id=current_user.id,
        claim_type=data.claim_type,
        amount_requested=int(data.amount),
        description=data.description,
    )
    
    db.add(claim)
    db.commit()
    db.refresh(claim)
    
    update_user_stats(db, current_user.id, claim=claim)
    
    return claim


@router.get("/claims", response_model=List[InsuranceClaimResponse])
def get_my_claims(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    status: Optional[str] = None,
    limit: int = 50,
    offset: int = 0
):
    """Get user's insurance claims"""
    query = db.query(InsuranceClaim).filter(InsuranceClaim.user_id == current_user.id)
    if status:
        query = query.filter(InsuranceClaim.status == status)
    claims = query.order_by(InsuranceClaim.created_at.desc()).offset(offset).limit(limit).all()
    return claims


@router.get("/claims/{claim_id}", response_model=InsuranceClaimResponse)
def get_claim_detail(
    claim_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific claim detail"""
    claim = db.query(InsuranceClaim).filter(InsuranceClaim.id == claim_id).first()
    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found")
    if claim.user_id != current_user.id and current_user.role not in ["admin", "agent"]:
        raise HTTPException(status_code=403, detail="Access denied")
    return claim


# ========== Stats Endpoints ==========
@router.get("/stats", response_model=UserInsuranceStatsResponse)
def get_my_insurance_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user's insurance statistics"""
    stats = get_or_create_stats(db, current_user.id)
    return stats