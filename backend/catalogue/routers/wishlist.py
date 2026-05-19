from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List
from sqlalchemy.orm import Session
from db.postgres import get_db
from models.order import WishlistItem
from models.auth import User
from routers.auth import get_current_user

router = APIRouter()

class WishlistResponse(BaseModel):
    product_id: int
    product_name: str
    product_price: float

@router.get("", )
@router.get("", response_model=List[WishlistResponse])
@router.get("/", response_model=List[WishlistResponse])
async def get_wishlist(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    items = db.query(WishlistItem).filter(WishlistItem.user_id == current_user.id).all()
    return [
        WishlistResponse(
            product_id=i.product_id,
            product_name=i.product.name if i.product else "Unknown",
            product_price=i.product.price if i.product else 0
        ) for i in items
    ]

@router.post("/{product_id}/toggle")
async def toggle_wishlist(product_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    existing = db.query(WishlistItem).filter(WishlistItem.user_id == current_user.id, WishlistItem.product_id == product_id).first()
    if existing:
        db.delete(existing)
        db.commit()
        return {"added": False}
    else:
        new_item = WishlistItem(user_id=current_user.id, product_id=product_id)
        db.add(new_item)
        db.commit()
        return {"added": True}