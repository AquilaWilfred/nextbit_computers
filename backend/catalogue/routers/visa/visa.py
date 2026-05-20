from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime, timedelta

from db.postgres import get_db
from routers.auth import get_current_user
from models.auth import User
from models.visa.visa import (
    CardProduct, CardApplication, VirtualCard, CardTransaction,
    CardHolder, ApplicationStatus, CardStatus, TransactionStatus,
    CardProductType
)
from schemas.visa.visa import (
    CardProductResponse, CardApplicationCreate, CardApplicationResponse,
    VirtualCardResponse, TransactionResponse, ToggleFreezeRequest,
    CardStatsResponse
)
from utils.visa.visa_utils import (
    generate_card_number, generate_expiry, generate_cvv, hash_cvv,
    calculate_risk_score, get_product_details
)

router = APIRouter(tags=["cards"])


# ========== Card Products ==========
@router.get("/products", response_model=List[CardProductResponse])
def get_card_products(db: Session = Depends(get_db)):
    """Get all available card products"""
    products = db.query(CardProduct).all()
    if not products:
        # Seed default products if none exist
        products = seed_card_products(db)
    return products


def seed_card_products(db: Session):
    """Seed default card products"""
    products = []
    for product_type in CardProductType:
        details = get_product_details(product_type.value)
        product = CardProduct(
            product_type=product_type,
            name=details["name"],
            annual_fee=details["annual_fee"],
            foreign_txn_fee=details["foreign_txn_fee"],
            atm_fee=details["atm_fee"],
            cashback_rate=details["cashback_rate"],
            features=details["features"],
            benefits=details["benefits"],
            requirements=details["requirements"],
            popular=product_type == CardProductType.E_NEXTBIT,
            color_bg=details["color_bg"],
            color_accent=details["color_accent"],
        )
        db.add(product)
        products.append(product)
    db.commit()
    return products


# ========== Applications ==========
@router.post("/apply", response_model=CardApplicationResponse)
def apply_for_card(
    data: CardApplicationCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Submit a card application"""
    # Check if user already has a pending application for this card type
    existing = db.query(CardApplication).filter(
        CardApplication.user_id == current_user.id,
        CardApplication.product_type == data.product_type,
        CardApplication.status.in_([ApplicationStatus.PENDING, ApplicationStatus.UNDER_REVIEW])
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="You already have a pending application for this card")
    
    # Calculate risk score
    risk_score = calculate_risk_score(data.employment)
    
    application = CardApplication(
        user_id=current_user.id,
        product_type=data.product_type,
        full_name=data.full_name,
        id_number=data.id_number,
        phone=data.phone,
        email=data.email,
        employment=data.employment,
        risk_score=risk_score,
    )
    
    db.add(application)
    db.commit()
    db.refresh(application)
    
    # Auto-approve if risk score is low
    if risk_score < 40:
        application.status = ApplicationStatus.APPROVED
        db.commit()
        # Create virtual card
        create_virtual_card(application.id, current_user.id, data.product_type, db)
    
    return application


def create_virtual_card(application_id: int, user_id: int, product_type: CardProductType, db: Session):
    """Create a virtual card for approved application"""
    application = db.query(CardApplication).filter(CardApplication.id == application_id).first()
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")

    card_number, last_four = generate_card_number()
    expiry_month, expiry_year = generate_expiry()
    cvv = generate_cvv()

    # Set expiry timestamp based on generated expiry month/year
    expiry_year_full = int(expiry_year) + 2000
    expires_at = datetime(expiry_year_full, int(expiry_month), 1)
    
    virtual_card = VirtualCard(
        user_id=user_id,
        application_id=application_id,
        product_type=product_type,
        card_number=card_number,
        last_four=last_four,
        expiry_month=expiry_month,
        expiry_year=expiry_year,
        cvv_hash=hash_cvv(cvv),
        status=CardStatus.ACTIVE,
        expires_at=expires_at,
    )
    
    db.add(virtual_card)
    db.commit()
    db.refresh(virtual_card)
    
    # Create or update card holder
    holder = db.query(CardHolder).filter(CardHolder.user_id == user_id).first()
    if not holder:
        holder = CardHolder(
            user_id=user_id,
            full_name=application.full_name,
            id_number=application.id_number,
            phone=application.phone,
            email=application.email,
            employment=application.employment,
        )
        db.add(holder)
        db.commit()


@router.get("/applications", response_model=List[CardApplicationResponse])
def get_my_applications(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user's card applications"""
    applications = db.query(CardApplication).filter(
        CardApplication.user_id == current_user.id
    ).order_by(CardApplication.applied_at.desc()).all()
    return applications


# ========== Virtual Card ==========
@router.get("/virtual", response_model=VirtualCardResponse)
def get_virtual_card(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user's active virtual card"""
    card = db.query(VirtualCard).filter(
        VirtualCard.user_id == current_user.id,
        VirtualCard.status.in_([CardStatus.ACTIVE, CardStatus.FROZEN])
    ).first()
    
    if not card:
        raise HTTPException(status_code=404, detail="No active virtual card found")
    
    return card


@router.post("/virtual/toggle-freeze")
def toggle_freeze_card(
    data: ToggleFreezeRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Freeze or unfreeze virtual card"""
    card = db.query(VirtualCard).filter(
        VirtualCard.user_id == current_user.id,
        VirtualCard.status.in_([CardStatus.ACTIVE, CardStatus.FROZEN])
    ).first()
    
    if not card:
        raise HTTPException(status_code=404, detail="No active virtual card found")
    
    card.status = CardStatus.FROZEN if data.freeze else CardStatus.ACTIVE
    db.commit()
    
    return {"success": True, "status": card.status}


# ========== Transactions ==========
@router.get("/stats", response_model=CardStatsResponse)
def get_card_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user card summary stats"""
    transactions = db.query(CardTransaction).filter(
        CardTransaction.user_id == current_user.id
    ).all()
    total_spent = sum(abs(t.amount) for t in transactions if t.amount < 0)
    rewards_earned = int(total_spent * 0.01)
    cards_issued = db.query(VirtualCard).filter(VirtualCard.user_id == current_user.id).count()

    return {
        "rewards_earned": rewards_earned,
        "security_level": "3D Secure",
        "total_spent": total_spent,
        "cards_issued": cards_issued,
    }


@router.get("/transactions", response_model=List[TransactionResponse])
def get_transactions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    limit: int = 10,
    offset: int = 0
):
    """Get user's card transactions"""
    transactions = db.query(CardTransaction).filter(
        CardTransaction.user_id == current_user.id
    ).order_by(CardTransaction.created_at.desc()).offset(offset).limit(limit).all()
    return transactions


@router.get("/balance")
def get_card_balance(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get card balance"""
    card = db.query(VirtualCard).filter(
        VirtualCard.user_id == current_user.id,
        VirtualCard.status.in_([CardStatus.ACTIVE, CardStatus.FROZEN])
    ).first()
    
    if not card:
        raise HTTPException(status_code=404, detail="No active virtual card found")
    
    return {"balance": card.balance, "currency": "KES"}