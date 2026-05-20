from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from db.postgres import get_db
from routers.auth import require_role
from models.auth import User
from models.listings.tradein import (
    TradeInListing, TradeInStats, ListingStatus, DeviceType
)
from schemas.listings.tradein import (
    AdminListingResponse, AdminStatsResponse, StatusUpdateRequest
)
from utils.listings.tradein_utils import get_device_label

router = APIRouter(prefix="/api/admin/tradein", tags=["admin-tradein"])


# ========== Helper Functions ==========
def update_user_stats_on_sale(db: Session, user_id: int, credit_amount: int):
    stats = db.query(TradeInStats).filter(TradeInStats.user_id == user_id).first()
    if stats:
        stats.sold_listings += 1
        stats.active_listings -= 1
        stats.total_credit_earned += credit_amount
        db.commit()


# ========== Statistics ==========
@router.get("/stats", response_model=AdminStatsResponse)
def get_admin_stats(
    current_user: User = Depends(require_role(["admin", "agent"])),
    db: Session = Depends(get_db)
):
    """Get trade-in admin dashboard statistics"""
    
    listings = db.query(TradeInListing).all()
    
    total_listings = len(listings)
    pending_listings = sum(1 for l in listings if l.status == ListingStatus.PENDING_VERIFICATION)
    listed_listings = sum(1 for l in listings if l.status == ListingStatus.LISTED)
    sold_listings = sum(1 for l in listings if l.status == ListingStatus.SOLD)
    rejected_listings = sum(1 for l in listings if l.status == ListingStatus.REJECTED)
    
    total_gmv = sum(l.asking_price_kes for l in listings if l.status == ListingStatus.SOLD)
    total_credit_issued = sum(l.credit_issued_kes or 0 for l in listings)
    total_views = sum(l.views or 0 for l in listings)
    
    avg_price = int(sum(l.asking_price_kes for l in listings) / total_listings) if total_listings > 0 else 0
    
    device_breakdown = {}
    for device in DeviceType:
        count = sum(1 for l in listings if l.device_type == device)
        if count > 0:
            device_breakdown[device.value] = count
    
    branches = list(set(l.drop_branch for l in listings if l.drop_branch))
    
    return AdminStatsResponse(
        total_listings=total_listings,
        pending_listings=pending_listings,
        listed_listings=listed_listings,
        sold_listings=sold_listings,
        rejected_listings=rejected_listings,
        total_gmv=total_gmv,
        total_credit_issued=total_credit_issued,
        total_views=total_views,
        avg_price=avg_price,
        device_breakdown=device_breakdown,
        branches=branches,
    )


# ========== Listings Management ==========
@router.get("/listings", response_model=List[AdminListingResponse])
def get_all_listings(
    current_user: User = Depends(require_role(["admin", "agent"])),
    db: Session = Depends(get_db),
    status: Optional[str] = None,
    device_type: Optional[str] = None,
    branch: Optional[str] = None,
    search: Optional[str] = None,
    sort_by: str = "date",
    limit: int = 100,
    offset: int = 0
):
    """Get all trade-in listings with filters"""
    query = db.query(TradeInListing)
    
    if status:
        query = query.filter(TradeInListing.status == status)
    if device_type:
        query = query.filter(TradeInListing.device_type == device_type)
    if branch:
        query = query.filter(TradeInListing.drop_branch == branch)
    if search:
        query = query.filter(
            (TradeInListing.brand.ilike(f"%{search}%")) |
            (TradeInListing.model.ilike(f"%{search}%")) |
            (TradeInListing.seller_name.ilike(f"%{search}%")) |
            (TradeInListing.listing_number.ilike(f"%{search}%"))
        )
    
    if sort_by == "price":
        query = query.order_by(TradeInListing.asking_price_kes.desc())
    elif sort_by == "views":
        query = query.order_by(TradeInListing.views.desc())
    else:
        query = query.order_by(TradeInListing.created_at.desc())
    
    listings = query.offset(offset).limit(limit).all()
    
    result = []
    for listing in listings:
        user = db.query(User).filter(User.id == listing.user_id).first()
        result.append(AdminListingResponse(
            id=listing.id,
            listing_number=listing.listing_number,
            device_type=listing.device_type,
            brand=listing.brand,
            model=listing.model,
            condition=listing.condition,
            asking_price_kes=listing.asking_price_kes,
            specs=listing.specs,
            images=listing.images,
            seller_name=listing.seller_name,
            seller_rating=listing.seller_rating,
            location=listing.location,
            drop_branch=listing.drop_branch,
            status=listing.status,
            views=listing.views,
            credit_issued_kes=listing.credit_issued_kes,
            created_at=listing.created_at,
            sold_at=listing.sold_at,
            user_id=listing.user_id,
            user_email=user.email if user else "unknown@email.com",
            rejection_reason=listing.rejection_reason,
            reviewed_by=listing.reviewed_by,
            reviewed_at=listing.reviewed_at,
        ))
    
    return result


@router.patch("/listings/{listing_id}/status")
def update_listing_status(
    listing_id: int,
    data: StatusUpdateRequest,
    current_user: User = Depends(require_role(["admin", "agent"])),
    db: Session = Depends(get_db)
):
    """Update listing status (approve, reject, mark as sold)"""
    
    listing = db.query(TradeInListing).filter(TradeInListing.id == listing_id).first()
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    
    old_status = listing.status
    listing.status = data.status
    listing.reviewed_by = current_user.email
    listing.reviewed_at = datetime.now()
    
    if data.status == ListingStatus.REJECTED:
        listing.rejection_reason = data.rejection_reason
    
    if data.status == ListingStatus.SOLD:
        if not data.credit_amount:
            raise HTTPException(status_code=400, detail="Credit amount required when marking as sold")
        listing.credit_issued_kes = data.credit_amount
        listing.sold_at = datetime.now()
        
        # Update user stats
        update_user_stats_on_sale(db, listing.user_id, data.credit_amount)
    
    db.commit()
    
    return {"success": True, "status": data.status}