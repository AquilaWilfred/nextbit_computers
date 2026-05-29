from base64 import b64encode
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from db.postgres import get_db
from routers.auth import get_current_user
from models.auth import User
from models.listings.tradein import (
    TradeInListing, TradeInStats, TradeInOffer, ListingStatus, DeviceType, DeviceCondition
)
from schemas.listings.tradein import (
    TradeInListingUpdate, TradeInListingResponse,
    UserTradeInStatsResponse
)
from utils.listings.tradein_utils import generate_listing_number

router = APIRouter(prefix="/api/tradein", tags=["tradein"])


# ========== Helper Functions ==========
def get_or_create_stats(db: Session, user_id: int) -> TradeInStats:
    stats = db.query(TradeInStats).filter(TradeInStats.user_id == user_id).first()
    if not stats:
        stats = TradeInStats(user_id=user_id)
        db.add(stats)
        db.commit()
        db.refresh(stats)
    return stats


def update_user_stats(db: Session, user_id: int, listing: TradeInListing = None, is_delete: bool = False):
    stats = get_or_create_stats(db, user_id)
    
    if listing:
        if is_delete:
            stats.total_listings -= 1
            if listing.status == ListingStatus.LISTED:
                stats.active_listings -= 1
            elif listing.status == ListingStatus.SOLD:
                stats.sold_listings -= 1
                stats.total_credit_earned -= (listing.credit_issued_kes or 0)
        else:
            stats.total_listings += 1
            if listing.status == ListingStatus.LISTED:
                stats.active_listings += 1
            elif listing.status == ListingStatus.SOLD:
                stats.sold_listings += 1
                stats.total_credit_earned += (listing.credit_issued_kes or 0)
        
        stats.total_views += (listing.views or 0)
    
    db.commit()


# ========== Customer Endpoints ==========
@router.post("/listings", response_model=TradeInListingResponse)
async def create_listing(
    device_type: DeviceType = Form(...),
    brand: str = Form(...),
    model: str = Form(...),
    condition: DeviceCondition = Form(...),
    asking_price_kes: int = Form(...),
    specs: Optional[str] = Form(None),
    location: Optional[str] = Form(None),
    drop_branch: str = Form(...),
    images: List[UploadFile] = File(default=[]),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new trade-in listing"""
    image_urls: List[str] = []
    for image in images:
        if image.content_type and not image.content_type.startswith("image/"):
            raise HTTPException(status_code=400, detail="All uploaded files must be images")
        contents = await image.read()
        if len(contents) == 0:
            continue
        encoded = b64encode(contents).decode('ascii')
        image_urls.append(f"data:{image.content_type};base64,{encoded}")

    listing = TradeInListing(
        listing_number=generate_listing_number(),
        device_type=device_type,
        brand=brand,
        model=model,
        condition=condition,
        asking_price_kes=asking_price_kes,
        specs=specs,
        images=image_urls,
        user_id=current_user.id,
        seller_name=getattr(current_user, "name", None) or getattr(current_user, "full_name", None) or current_user.email,
        location=location,
        drop_branch=drop_branch,
    )
    
    db.add(listing)
    db.commit()
    db.refresh(listing)
    
    update_user_stats(db, current_user.id, listing)
    
    return listing


@router.get("/listings", response_model=List[TradeInListingResponse])
def get_my_listings(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    status: Optional[str] = None,
    limit: int = 50,
    offset: int = 0
):
    """Get user's trade-in listings"""
    query = db.query(TradeInListing).filter(TradeInListing.user_id == current_user.id)
    if status:
        query = query.filter(TradeInListing.status == status)
    listings = query.order_by(TradeInListing.created_at.desc()).offset(offset).limit(limit).all()
    return listings


@router.get("/listings/{listing_id}", response_model=TradeInListingResponse)
def get_listing_detail(
    listing_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific listing detail"""
    listing = db.query(TradeInListing).filter(TradeInListing.id == listing_id).first()
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    if listing.user_id != current_user.id and current_user.role not in ["admin", "agent"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Increment view count for active listings
    if listing.status == ListingStatus.LISTED:
        listing.views += 1
        db.commit()
    
    return listing


@router.put("/listings/{listing_id}", response_model=TradeInListingResponse)
def update_listing(
    listing_id: int,
    data: TradeInListingUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a trade-in listing (only if pending or listed)"""
    listing = db.query(TradeInListing).filter(TradeInListing.id == listing_id).first()
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    if listing.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    if listing.status not in [ListingStatus.PENDING_VERIFICATION, ListingStatus.LISTED]:
        raise HTTPException(status_code=400, detail="Cannot update listing at current status")
    
    updates = data.dict(exclude_unset=True)
    for key, value in updates.items():
        setattr(listing, key, value)
    
    db.commit()
    db.refresh(listing)
    
    return listing


@router.delete("/listings/{listing_id}")
def delete_listing(
    listing_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a trade-in listing.

    - Always fully remove the listing from the database when the user drops it.
    - Remove any related offers first to avoid foreign-key conflicts.
    """
    listing = db.query(TradeInListing).filter(TradeInListing.id == listing_id).first()
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    if listing.user_id != current_user.id and current_user.role not in ["admin", "agent"]:
        raise HTTPException(status_code=403, detail="Access denied")

    # Remove any dependent offers before deleting the listing.
    db.query(TradeInOffer).filter(TradeInOffer.listing_id == listing.id).delete(synchronize_session=False)
    update_user_stats(db, current_user.id, listing, is_delete=True)
    db.delete(listing)
    db.commit()
    return {"success": True, "deleted": True}


@router.get("/stats", response_model=UserTradeInStatsResponse)
def get_my_tradein_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user's trade-in statistics"""
    stats = get_or_create_stats(db, current_user.id)
    return stats