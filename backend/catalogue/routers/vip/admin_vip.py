from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timedelta

from db.postgres import get_db
from routers.auth import require_role
from models.auth import User
from models.vip.vip import (
    VIPMembership, VIPServicePurchase, VIPShipmentRequest,
    TierEnum, MemberStatusEnum, PurchaseStatusEnum, ShipmentStatusEnum
)
from schemas.vip.vip import (
    AdminStatsResponse, AdminMemberResponse, ServicePurchaseResponse,
    ShipmentRequestResponse, UpdateMembershipRequest, UpdateShipmentStatusRequest
)
from utils.vip.vip_utils import get_tier_benefits, get_tier_price

router = APIRouter(tags=["admin-vip"])


# ========== Statistics ==========
@router.get("/stats", response_model=AdminStatsResponse)
def get_vip_stats(
    current_user: User = Depends(require_role(["admin", "agent"])),
    db: Session = Depends(get_db)
):
    """Get VIP admin dashboard statistics"""
    
    members = db.query(VIPMembership).all()
    purchases = db.query(VIPServicePurchase).all()
    shipments = db.query(VIPShipmentRequest).all()
    
    total_members = len(members)
    active_members = sum(1 for m in members if m.status == MemberStatusEnum.ACTIVE)
    pending_members = sum(1 for m in members if m.status == MemberStatusEnum.PENDING)
    inactive_members = sum(1 for m in members if m.status == MemberStatusEnum.INACTIVE)
    
    gold_members = sum(1 for m in members if m.tier == TierEnum.GOLD)
    platinum_members = sum(1 for m in members if m.tier == TierEnum.PLATINUM)
    diamond_members = sum(1 for m in members if m.tier == TierEnum.DIAMOND)
    
    total_mrr = sum(get_tier_price(m.tier) for m in members if m.status == MemberStatusEnum.ACTIVE)
    total_spent = sum(m.total_spent for m in members)
    total_service_revenue = sum(p.amount for p in purchases if p.status == PurchaseStatusEnum.PAID)
    pending_purchases = sum(1 for p in purchases if p.status == PurchaseStatusEnum.PENDING)
    
    shipments_in_transit = sum(1 for s in shipments if s.status == ShipmentStatusEnum.IN_TRANSIT)
    shipments_delivered = sum(1 for s in shipments if s.status == ShipmentStatusEnum.DELIVERED)
    shipment_revenue = sum(s.cost for s in shipments if s.status != ShipmentStatusEnum.CANCELLED)
    
    return AdminStatsResponse(
        total_members=total_members,
        active_members=active_members,
        pending_members=pending_members,
        inactive_members=inactive_members,
        gold_members=gold_members,
        platinum_members=platinum_members,
        diamond_members=diamond_members,
        total_mrr=total_mrr,
        total_spent=total_spent,
        total_service_revenue=total_service_revenue,
        pending_purchases=pending_purchases,
        shipments_in_transit=shipments_in_transit,
        shipments_delivered=shipments_delivered,
        shipment_revenue=shipment_revenue,
    )


# ========== Members Management ==========
@router.get("/members", response_model=List[AdminMemberResponse])
def get_all_members(
    current_user: User = Depends(require_role(["admin", "agent"])),
    db: Session = Depends(get_db),
    tier: Optional[str] = None,
    status: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = 100,
    offset: int = 0
):
    """Get all VIP members with filters"""
    query = db.query(VIPMembership)
    
    if tier:
        query = query.filter(VIPMembership.tier == tier)
    if status:
        query = query.filter(VIPMembership.status == status)
    
    members = query.offset(offset).limit(limit).all()
    
    result = []
    for member in members:
        user = db.query(User).filter(User.id == member.user_id).first()
        # Prefer `name` field on User model; fall back to email or a placeholder
        name = None
        email = "unknown@email.com"
        phone = ""
        if user:
            name = getattr(user, "name", None) or getattr(user, "email", None)
            email = getattr(user, "email", email)
            phone = getattr(user, "phone", "") or ""

        result.append(AdminMemberResponse(
            id=member.id,
            name=name or "Unknown",
            email=email,
            phone=phone,
            tier=member.tier,
            status=member.status,
            joined_at=member.joined_at,
            expires_at=member.expires_at,
            auto_renewal=member.auto_renewal,
            total_spent=member.total_spent,
            services_purchased=member.services_purchased,
            location=member.location,
        ))
    
    return result


@router.get("/members/{member_id}", response_model=AdminMemberResponse)
def get_member_detail(
    member_id: int,
    current_user: User = Depends(require_role(["admin", "agent"])),
    db: Session = Depends(get_db)
):
    """Get single member details"""
    member = db.query(VIPMembership).filter(VIPMembership.id == member_id).first()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    
    user = db.query(User).filter(User.id == member.user_id).first()
    name = None
    email = "unknown@email.com"
    phone = ""
    if user:
        name = getattr(user, "name", None) or getattr(user, "email", None)
        email = getattr(user, "email", email)
        phone = getattr(user, "phone", "") or ""

    return AdminMemberResponse(
        id=member.id,
        name=name or "Unknown",
        email=email,
        phone=phone,
        tier=member.tier,
        status=member.status,
        joined_at=member.joined_at,
        expires_at=member.expires_at,
        auto_renewal=member.auto_renewal,
        total_spent=member.total_spent,
        services_purchased=member.services_purchased,
        location=member.location,
    )


@router.patch("/members/{member_id}")
def update_member(
    member_id: int,
    data: UpdateMembershipRequest,
    current_user: User = Depends(require_role(["admin", "agent"])),
    db: Session = Depends(get_db)
):
    """Update member details"""
    member = db.query(VIPMembership).filter(VIPMembership.id == member_id).first()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    
    updates = data.dict(exclude_unset=True)
    for key, value in updates.items():
        setattr(member, key, value)
    
    db.commit()
    return {"success": True}


# ========== Purchases Management ==========
@router.get("/purchases", response_model=List[ServicePurchaseResponse])
def get_all_purchases(
    current_user: User = Depends(require_role(["admin", "agent"])),
    db: Session = Depends(get_db),
    status: Optional[str] = None,
    limit: int = 200,
    offset: int = 0
):
    """Get all service purchases"""
    query = db.query(VIPServicePurchase)
    
    if status:
        query = query.filter(VIPServicePurchase.status == status)
    
    purchases = query.order_by(VIPServicePurchase.purchased_at.desc()).offset(offset).limit(limit).all()
    return purchases


@router.patch("/purchases/{purchase_id}/status")
def update_purchase_status(
    purchase_id: int,
    status: PurchaseStatusEnum,
    current_user: User = Depends(require_role(["admin", "agent"])),
    db: Session = Depends(get_db)
):
    """Update purchase status"""
    purchase = db.query(VIPServicePurchase).filter(VIPServicePurchase.id == purchase_id).first()
    if not purchase:
        raise HTTPException(status_code=404, detail="Purchase not found")
    
    purchase.status = status
    db.commit()
    
    return {"success": True}


# ========== Shipments Management ==========
@router.get("/shipments", response_model=List[ShipmentRequestResponse])
def get_all_shipments(
    current_user: User = Depends(require_role(["admin", "agent"])),
    db: Session = Depends(get_db),
    status: Optional[str] = None,
    limit: int = 200,
    offset: int = 0
):
    """Get all shipment requests"""
    query = db.query(VIPShipmentRequest)
    
    if status:
        query = query.filter(VIPShipmentRequest.status == status)
    
    shipments = query.order_by(VIPShipmentRequest.created_at.desc()).offset(offset).limit(limit).all()
    return shipments


@router.patch("/shipments/{shipment_id}/status")
def update_shipment_status(
    shipment_id: int,
    data: UpdateShipmentStatusRequest,
    current_user: User = Depends(require_role(["admin", "agent"])),
    db: Session = Depends(get_db)
):
    """Update shipment status and optionally generate tracking number"""
    shipment = db.query(VIPShipmentRequest).filter(VIPShipmentRequest.id == shipment_id).first()
    if not shipment:
        raise HTTPException(status_code=404, detail="Shipment not found")
    
    shipment.status = data.status
    if data.status == ShipmentStatusEnum.IN_TRANSIT and not shipment.tracking_number:
        import random
        import string
        prefix = "NB-INTL" if shipment.type == "international" else "NB-EXP"
        shipment.tracking_number = f"{prefix}-{''.join(random.choices(string.digits, k=5))}"
    
    db.commit()
    
    return {"success": True, "tracking_number": shipment.tracking_number}