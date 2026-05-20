from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime

from db.postgres import get_db
from routers.auth import get_current_user
from models.auth import User
from models.vip.vip import (
    VIPMembership, VIPService, VIPServicePurchase, VIPShipmentRequest,
    TierEnum, MemberStatusEnum, PurchaseStatusEnum, ShipmentStatusEnum,
    ServiceCategoryEnum
)
from schemas.vip.vip import (
    VIPMembershipResponse, VIPServiceResponse, ServicePurchaseResponse,
    ShipmentRequestCreate, ShipmentRequestResponse, UpgradeMembershipRequest,
    PurchaseServiceRequest
)
from utils.vip.vip_utils import (
    calculate_expiry_date, get_tier_benefits, get_tier_price,
    calculate_shipment_cost
)

router = APIRouter(tags=["vip"])


# ========== Seed Data Helper ==========
def seed_vip_services(db: Session):
    """Seed default VIP services if none exist"""
    services = db.query(VIPService).count()
    if services > 0:
        return

    default_services = [
        {
            "name": "NextBit Express",
            "description": "1-4 hour urgent delivery service across Nairobi and major towns",
            "features": ["Same-day delivery guarantee", "Real-time GPS tracking", "Dedicated delivery agent", "Signature required", "Insurance included"],
            "category": ServiceCategoryEnum.SHIPPING,
            "pricing_type": "one-time",
            "pricing_amount": 1500,
            "pricing_period": None,
        },
        {
            "name": "International White-Glove Service",
            "description": "Premium international shipping with customs clearance and concierge support",
            "features": ["Door-to-door service", "Customs clearance assistance", "Real-time tracking", "Insurance up to $10,000", "Priority handling"],
            "category": ServiceCategoryEnum.SHIPPING,
            "pricing_type": "one-time",
            "pricing_amount": 25000,
            "pricing_period": None,
        },
        {
            "name": "VIP Concierge Support",
            "description": "24/7 dedicated support with priority response and personal assistant",
            "features": ["Dedicated account manager", "Priority phone support", "WhatsApp concierge", "Emergency assistance", "Personal shopping assistant"],
            "category": ServiceCategoryEnum.SUPPORT,
            "pricing_type": "subscription",
            "pricing_amount": 5000,
            "pricing_period": "month",
        },
        {
            "name": "Exclusive Product Access",
            "description": "Early access to limited edition products and special collections",
            "features": ["Pre-launch access", "Limited edition products", "VIP pricing", "Exclusive events", "Personal styling sessions"],
            "category": ServiceCategoryEnum.EXCLUSIVE,
            "pricing_type": "subscription",
            "pricing_amount": 10000,
            "pricing_period": "month",
        },
    ]

    for service_data in default_services:
        service = VIPService(**service_data)
        db.add(service)
    db.commit()


# ========== Get or Create Membership ==========
def get_or_create_membership(db: Session, user_id: int) -> VIPMembership:
    membership = db.query(VIPMembership).filter(VIPMembership.user_id == user_id).first()
    if not membership:
        membership = VIPMembership(
            user_id=user_id,
            tier=TierEnum.GOLD,
            status=MemberStatusEnum.PENDING,
            expires_at=calculate_expiry_date(TierEnum.GOLD),
        )
        db.add(membership)
        db.commit()
        db.refresh(membership)
    return membership


# ========== Membership Endpoints ==========
@router.get("/membership", response_model=VIPMembershipResponse)
def get_membership(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current user's VIP membership"""
    membership = get_or_create_membership(db, current_user.id)
    benefits = get_tier_benefits(membership.tier)
    return VIPMembershipResponse(
        id=membership.id,
        tier=membership.tier,
        status=membership.status,
        auto_renewal=membership.auto_renewal,
        joined_at=membership.joined_at,
        expires_at=membership.expires_at,
        total_spent=membership.total_spent,
        services_purchased=membership.services_purchased,
        location=membership.location,
        benefits=benefits,
    )


@router.post("/membership/upgrade")
def upgrade_membership(
    data: UpgradeMembershipRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Upgrade VIP membership tier"""
    membership = get_or_create_membership(db, current_user.id)
    
    if membership.tier == data.tier:
        raise HTTPException(status_code=400, detail="Already at this tier")
    
    # Check if user can upgrade (higher tier only)
    tier_order = {"gold": 1, "platinum": 2, "diamond": 3}
    if tier_order[data.tier.value] <= tier_order[membership.tier.value]:
        raise HTTPException(status_code=400, detail="Cannot downgrade. Contact support.")
    
    membership.tier = data.tier
    membership.expires_at = calculate_expiry_date(data.tier)
    membership.status = MemberStatusEnum.ACTIVE
    db.commit()
    
    return {"success": True, "tier": data.tier, "expires_at": membership.expires_at}


# ========== Services Endpoints ==========
@router.get("/services", response_model=List[VIPServiceResponse])
def get_services(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all available VIP services"""
    seed_vip_services(db)
    services = db.query(VIPService).filter(VIPService.active == True).all()
    return services


@router.post("/services/purchase")
def purchase_service(
    data: PurchaseServiceRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Purchase a VIP service"""
    service = db.query(VIPService).filter(VIPService.id == data.service_id).first()
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    
    membership = get_or_create_membership(db, current_user.id)
    
    member_name = getattr(current_user, "name", None) or getattr(current_user, "email", "")
    purchase = VIPServicePurchase(
        user_id=current_user.id,
        service_id=service.id,
        member_name=member_name,
        service_name=service.name,
        amount=service.pricing_amount,
        status=PurchaseStatusEnum.PAID,
        category=service.category,
    )
    
    # Update membership stats
    membership.services_purchased += 1
    membership.total_spent += service.pricing_amount
    
    db.add(purchase)
    db.commit()
    
    return {"success": True, "service": service.name, "amount": service.pricing_amount}


@router.get("/purchases", response_model=List[ServicePurchaseResponse])
def get_purchases(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    limit: int = 50,
    offset: int = 0
):
    """Get user's service purchases"""
    purchases = db.query(VIPServicePurchase).filter(
        VIPServicePurchase.user_id == current_user.id
    ).order_by(VIPServicePurchase.purchased_at.desc()).offset(offset).limit(limit).all()
    return purchases


# ========== Shipment Endpoints ==========
@router.post("/shipments/calculate")
def calculate_shipment_cost_endpoint(
    data: ShipmentRequestCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Calculate shipment cost before creating request"""
    cost = calculate_shipment_cost(data.type.value, data.weight, data.declared_value)
    return {
        "cost": cost,
        "currency": "KES",
        "estimated_delivery": "3-5 business days" if data.type == "international" else "1-2 business days",
    }


@router.post("/shipments", response_model=ShipmentRequestResponse)
def create_shipment_request(
    data: ShipmentRequestCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a shipment request"""
    membership = get_or_create_membership(db, current_user.id)
    
    cost = calculate_shipment_cost(data.type.value, data.weight, data.declared_value)
    estimated_delivery = datetime.now()
    if data.type == "international":
        estimated_delivery = datetime.now() + timedelta(days=7)
    else:
        estimated_delivery = datetime.now() + timedelta(days=2)
    
    member_name = getattr(current_user, "name", None) or getattr(current_user, "email", "")
    shipment = VIPShipmentRequest(
        user_id=current_user.id,
        member_name=member_name,
        type=data.type,
        destination=data.destination,
        weight=data.weight,
        declared_value=data.declared_value,
        cost=cost,
        estimated_delivery=estimated_delivery,
    )
    
    db.add(shipment)
    db.commit()
    db.refresh(shipment)
    
    return shipment


@router.get("/shipments", response_model=List[ShipmentRequestResponse])
def get_shipments(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    limit: int = 50,
    offset: int = 0
):
    """Get user's shipment requests"""
    shipments = db.query(VIPShipmentRequest).filter(
        VIPShipmentRequest.user_id == current_user.id
    ).order_by(VIPShipmentRequest.created_at.desc()).offset(offset).limit(limit).all()
    return shipments