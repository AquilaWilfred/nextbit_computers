from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List
from sqlalchemy.orm import Session
from db.postgres import get_db
from models.order import CartItem
from models.auth import User
from routers.auth import get_current_user

router = APIRouter()

class CartItemRequest(BaseModel):
    product_id: int
    quantity: int

class CartItemResponse(BaseModel):
    id: int
    product_id: int
    quantity: int
    product_name: str
    product_price: float
    product_images: list[str]
    product_slug: str
    product_stock: int
    product_brand: str | None

@router.get("", response_model=List[CartItemResponse])
@router.get("/", response_model=List[CartItemResponse])
async def get_cart(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    items = db.query(CartItem).filter(CartItem.user_id == current_user.id).all()
    return [
        CartItemResponse(
            id=i.id,
            product_id=i.product_id,
            quantity=i.quantity,
            product_name=i.product.name if i.product else "Unknown",
            product_price=float(i.product.price) if i.product else 0,
            product_images=i.product.images if i.product and i.product.images else [],
            product_slug=i.product.slug if i.product else "",
            product_stock=getattr(i.product, "stock_quantity", 0) if i.product else 0,
            product_brand=i.product.brand if i.product else None,
        ) for i in items
    ]

@router.post("/items")
async def add_to_cart(item: CartItemRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Check if item already in cart
    existing = db.query(CartItem).filter(CartItem.user_id == current_user.id, CartItem.product_id == item.product_id).first()
    if existing:
        existing.quantity += item.quantity
    else:
        new_item = CartItem(user_id=current_user.id, product_id=item.product_id, quantity=item.quantity)
        db.add(new_item)
    db.commit()
    return {"message": "Added to cart"}

@router.delete("/items/{item_id}")
async def remove_from_cart(item_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    item = db.query(CartItem).filter(CartItem.id == item_id, CartItem.user_id == current_user.id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Cart item not found")
    db.delete(item)
    db.commit()
    return {"message": "Removed from cart"}

@router.post("/sync-from-guest")
async def sync_from_guest(items: List[CartItemRequest], current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Clear existing cart
    db.query(CartItem).filter(CartItem.user_id == current_user.id).delete()
    # Add new items
    for item in items:
        new_item = CartItem(user_id=current_user.id, product_id=item.product_id, quantity=item.quantity)
        db.add(new_item)
    db.commit()
    return {"message": "Cart synced"}
@router.post("/upsert")
async def upsert_cart_item(item: CartItemRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    existing = db.query(CartItem).filter(
        CartItem.user_id == current_user.id,
        CartItem.product_id == item.product_id
    ).first()
    if existing:
        existing.quantity = item.quantity  # upsert = set, not increment
    else:
        db.add(CartItem(user_id=current_user.id, product_id=item.product_id, quantity=item.quantity))
    db.commit()
    return {"message": "Cart updated"}
