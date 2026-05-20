from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timedelta

from db.postgres import get_db
from routers.auth import require_role
from models.auth import User
from models.visa.visa import (
    VirtualCard, CardApplication, CardHolder, CardTransaction,
    CardProduct, ApplicationStatus, CardStatus, KYCStatus,
    TransactionStatus, CardProductType
)
from schemas.visa.visa import (
    AdminStatsResponse, CardRecordResponse, CardApplicationResponse,
    CardHolderResponse, TransactionResponse, ApplicationReviewRequest,
    KYCUpdateRequest
)

router = APIRouter(tags=["admin-cards"])


# ========== Statistics ==========
@router.get("/stats", response_model=AdminStatsResponse)
def get_admin_stats(
    current_user: User = Depends(require_role(["admin", "agent"])),
    db: Session = Depends(get_db)
):
    """Get admin dashboard statistics"""
    
    cards = db.query(VirtualCard).all()
    applications = db.query(CardApplication).all()
    holders = db.query(CardHolder).all()
    transactions = db.query(CardTransaction).all()
    
    today = datetime.now().date()
    today_start = datetime(today.year, today.month, today.day)
    
    approved_today = db.query(CardApplication).filter(
        CardApplication.status == ApplicationStatus.APPROVED,
        CardApplication.reviewed_at >= today_start
    ).count()
    
    rejected_today = db.query(CardApplication).filter(
        CardApplication.status == ApplicationStatus.REJECTED,
        CardApplication.reviewed_at >= today_start
    ).count()
    
    fraud_flags = db.query(VirtualCard).filter(VirtualCard.fraud_flag == True).count()
    fraud_flags += db.query(CardTransaction).filter(CardTransaction.status == TransactionStatus.FLAGGED).count()
    
    expiring_soon = datetime.now() + timedelta(days=90)
    expiring = db.query(VirtualCard).filter(
        VirtualCard.expires_at <= expiring_soon,
        VirtualCard.status == CardStatus.ACTIVE
    ).count()
    
    last_month = datetime.now() - timedelta(days=30)
    new_holders = db.query(CardHolder).filter(CardHolder.created_at >= last_month).count()
    
    return AdminStatsResponse(
        total_cards=len(cards),
        active_cards=sum(1 for c in cards if c.status == CardStatus.ACTIVE),
        frozen_cards=sum(1 for c in cards if c.status == CardStatus.FROZEN),
        pending_applications=sum(1 for a in applications if a.status == ApplicationStatus.PENDING),
        approved_today=approved_today,
        rejected_today=rejected_today,
        total_spend_volume=sum(c.total_spent for c in cards),
        total_loaded_balance=sum(c.balance for c in cards),
        fraud_flags=fraud_flags,
        expiring_soon=expiring,
        total_holders=len(holders),
        new_holders_this_month=new_holders,
    )


# ========== Cards Management ==========
@router.get("", response_model=List[CardRecordResponse])
def get_all_cards(
    current_user: User = Depends(require_role(["admin", "agent"])),
    db: Session = Depends(get_db),
    status: Optional[str] = None,
    product_type: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = 100,
    offset: int = 0
):
    """Get all cards with filters"""
    query = db.query(VirtualCard)
    
    if status:
        query = query.filter(VirtualCard.status == status)
    if product_type:
        query = query.filter(VirtualCard.product_type == product_type)
    
    cards = query.offset(offset).limit(limit).all()
    
    result = []
    for card in cards:
        user = db.query(User).filter(User.id == card.user_id).first()
        result.append(CardRecordResponse(
            id=card.id,
            holder_name=user.name if user else "Unknown",
            holder_email=user.email if user else "unknown@email.com",
            card_type=card.product_type,
            card_number=card.card_number,
            last_four=card.last_four,
            status=card.status,
            balance=card.balance,
            total_spent=card.total_spent,
            issued_at=card.issued_at,
            expires_at=card.expires_at,
            fraud_flag=card.fraud_flag,
            country="Kenya",
        ))
    
    return result


@router.patch("/{card_id}/status")
def update_card_status(
    card_id: int,
    status: CardStatus,
    current_user: User = Depends(require_role(["admin", "agent"])),
    db: Session = Depends(get_db)
):
    """Freeze, unfreeze, or cancel a card"""
    card = db.query(VirtualCard).filter(VirtualCard.id == card_id).first()
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")
    
    card.status = status
    db.commit()
    
    return {"success": True, "status": status}


# ========== Applications Management ==========
@router.get("/applications", response_model=List[CardApplicationResponse])
def get_applications(
    current_user: User = Depends(require_role(["admin", "agent"])),
    db: Session = Depends(get_db),
    status: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = 100,
    offset: int = 0
):
    """Get card applications with filters"""
    query = db.query(CardApplication)
    
    if status:
        query = query.filter(CardApplication.status == status)
    if search:
        query = query.filter(
            (CardApplication.full_name.ilike(f"%{search}%")) |
            (CardApplication.email.ilike(f"%{search}%"))
        )
    
    applications = query.order_by(CardApplication.applied_at.desc()).offset(offset).limit(limit).all()
    return applications


@router.post("/applications/{application_id}/review")
def review_application(
    application_id: int,
    data: ApplicationReviewRequest,
    current_user: User = Depends(require_role(["admin", "agent"])),
    db: Session = Depends(get_db)
):
    """Approve or reject a card application"""
    application = db.query(CardApplication).filter(CardApplication.id == application_id).first()
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")
    
    if data.action == "approved":
        application.status = ApplicationStatus.APPROVED
        db.commit()
        
        # Create virtual card
        from routers.visa.visa import create_virtual_card
        create_virtual_card(application.id, application.user_id, application.product_type, db)
        
    elif data.action == "rejected":
        application.status = ApplicationStatus.REJECTED
        application.rejection_reason = data.rejection_reason
        db.commit()
    else:
        raise HTTPException(status_code=400, detail="Invalid action")
    
    application.reviewed_by = current_user.email
    application.reviewed_at = datetime.now()
    db.commit()
    
    return {"success": True, "status": application.status}


# ========== Holders Management ==========
@router.get("/holders", response_model=List[CardHolderResponse])
def get_card_holders(
    current_user: User = Depends(require_role(["admin", "agent"])),
    db: Session = Depends(get_db),
    search: Optional[str] = None,
    limit: int = 100,
    offset: int = 0
):
    """Get card holders"""
    query = db.query(CardHolder)
    
    if search:
        query = query.filter(
            (CardHolder.full_name.ilike(f"%{search}%")) |
            (CardHolder.email.ilike(f"%{search}%")) |
            (CardHolder.id_number == search)
        )
    
    holders = query.offset(offset).limit(limit).all()
    
    result = []
    for holder in holders:
        cards_count = db.query(VirtualCard).filter(VirtualCard.user_id == holder.user_id).count()
        result.append(CardHolderResponse(
            id=holder.id,
            user_id=holder.user_id,
            full_name=holder.full_name,
            id_number=holder.id_number,
            phone=holder.phone,
            email=holder.email,
            employment=holder.employment,
            kyc_status=holder.kyc_status,
            cards=cards_count,
            created_at=holder.created_at,
        ))
    
    return result


@router.patch("/holders/{holder_id}/kyc")
def update_kyc_status(
    holder_id: int,
    data: KYCUpdateRequest,
    current_user: User = Depends(require_role(["admin", "agent"])),
    db: Session = Depends(get_db)
):
    """Update KYC status for a card holder"""
    holder = db.query(CardHolder).filter(CardHolder.id == holder_id).first()
    if not holder:
        raise HTTPException(status_code=404, detail="Holder not found")
    
    holder.kyc_status = data.status
    if data.status == KYCStatus.VERIFIED:
        holder.kyc_verified_at = datetime.now()
        holder.kyc_verified_by = current_user.email
    
    db.commit()
    
    return {"success": True, "status": data.status}


# ========== Transactions Management ==========
@router.get("/transactions", response_model=List[TransactionResponse])
def get_all_transactions(
    current_user: User = Depends(require_role(["admin", "agent"])),
    db: Session = Depends(get_db),
    status: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = 200,
    offset: int = 0
):
    """Get all card transactions"""
    query = db.query(CardTransaction)
    
    if status:
        query = query.filter(CardTransaction.status == status)
    if search:
        query = query.filter(CardTransaction.merchant.ilike(f"%{search}%"))
    
    transactions = query.order_by(CardTransaction.created_at.desc()).offset(offset).limit(limit).all()
    return transactions


@router.post("/transactions/{transaction_id}/clear-flag")
def clear_transaction_flag(
    transaction_id: int,
    current_user: User = Depends(require_role(["admin", "agent"])),
    db: Session = Depends(get_db)
):
    """Clear fraud flag on a transaction"""
    transaction = db.query(CardTransaction).filter(CardTransaction.id == transaction_id).first()
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    transaction.status = TransactionStatus.COMPLETED
    db.commit()
    
    return {"success": True}


# ========== Fraud Management ==========
@router.get("/fraud")
def get_fraud_alerts(
    current_user: User = Depends(require_role(["admin", "agent"])),
    db: Session = Depends(get_db)
):
    """Get fraud alerts (flagged cards and transactions)"""
    
    flagged_cards = db.query(VirtualCard).filter(VirtualCard.fraud_flag == True).all()
    
    flagged_transactions = db.query(CardTransaction).filter(
        CardTransaction.status == TransactionStatus.FLAGGED
    ).all()
    
    return {
        "flagged_cards": [
            {
                "id": c.id,
                "holder_name": db.query(User).filter(User.id == c.user_id).first().full_name,
                "card_number": c.card_number,
                "status": c.status,
                "balance": c.balance,
            }
            for c in flagged_cards
        ],
        "flagged_transactions": [
            {
                "id": t.id,
                "merchant": t.merchant,
                "amount": t.amount,
                "created_at": t.created_at,
            }
            for t in flagged_transactions
        ],
    }