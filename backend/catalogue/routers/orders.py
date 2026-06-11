from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List
from sqlalchemy.orm import Session
from db.postgres import get_db
from models.auth import User
from models.product import Product as ProductModel
from models.order import Order as OrderModel, OrderItem, OrderStatus
from models.listings.tradein import TradeInListing, ListingStatus
from routers.auth import get_current_user

LISTING_PRODUCT_ID_OFFSET = 1000000000
router = APIRouter()

class OrderItemRequest(BaseModel):
    product_id: int
    quantity: int

class CreateOrderRequest(BaseModel):
    items: List[OrderItemRequest] = []
    shipping_address: str | None = None
    shippingFullName: str | None = None
    shippingPhone: str | None = None
    shippingAddress: str | None = None
    shippingCounty: str | None = None
    shippingCity: str | None = None
    shippingPostalCode: str | None = None
    shippingCountry: str | None = None
    shippingEmail: str | None = None
    guestCartItems: list | None = None
    paymentMethod: str | None = None
    isExpress: bool | None = None
    discountCode: str | None = None
    saveAddress: bool | None = None

class OrderResponse(BaseModel):
    id: int
    user_id: int
    total_amount: float
    status: str
    shipping_address: str
    created_at: str
    seller_openid: str | None = None  # openId of seller — None means NextBit is seller
    seller_id: str | None = None
    order_number: str | None = None

class OrderDetailResponse(BaseModel):
    id: int
    user_id: int
    total_amount: float
    status: str
    shipping_address: str
    items: List[dict]
    created_at: str


class CancelOrderRequest(BaseModel):
    orderNumber: str
    reason: str | None = None

@router.post("/", response_model=OrderResponse)
@router.post("/", response_model=OrderResponse)
async def create_order(request: CreateOrderRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Build shipping address from rich fields if needed
    if not request.shipping_address:
        parts = list(filter(None, [
            request.shippingFullName, request.shippingAddress,
            request.shippingCity, request.shippingCounty,
            request.shippingPostalCode, request.shippingCountry,
            request.shippingPhone,
        ]))
        request.shipping_address = ", ".join(parts) or "N/A"

    # If no items sent, pull from user DB cart
    if not request.items:
        from models.order import CartItem
        cart_rows = db.query(CartItem).filter(CartItem.user_id == current_user.id).all()
        if not cart_rows:
            raise HTTPException(status_code=400, detail="Cart is empty")
        request.items = [OrderItemRequest(product_id=c.product_id, quantity=c.quantity) for c in cart_rows]

    # Calculate totals
    subtotal = 0
    order_items = []
    for item in request.items:
        if item.product_id >= LISTING_PRODUCT_ID_OFFSET:
            listing_id = item.product_id - LISTING_PRODUCT_ID_OFFSET
            listing = db.query(TradeInListing).filter(TradeInListing.id == listing_id).first()
            if not listing:
                raise HTTPException(status_code=400, detail=f"Product {item.product_id} not found")
            if listing.status != ListingStatus.LISTED:
                raise HTTPException(status_code=400, detail=f"Trade-in listing {listing.listing_number} is not available")
            if item.quantity != 1:
                raise HTTPException(status_code=400, detail=f"Trade-in listing quantity must be 1")

            unit_price = float(listing.asking_price_kes)
            subtotal += unit_price * item.quantity
            order_items.append(OrderItem(
                product_id=None,
                listing_id=listing.id,
                quantity=item.quantity,
                unit_price=unit_price
            ))
            continue

        product = db.query(ProductModel).filter(ProductModel.id == item.product_id).first()
        if not product:
            raise HTTPException(status_code=400, detail=f"Product {item.product_id} not found")
        if product.stock_quantity < item.quantity:
            raise HTTPException(status_code=400, detail=f"Insufficient stock for {product.name}")
        subtotal += float(product.price) * item.quantity
        order_items.append(OrderItem(
            product_id=item.product_id,
            listing_id=None,
            quantity=item.quantity,
            unit_price=product.price
        ))
        product.stock_quantity -= item.quantity

    shipping_cost = 0.0
    total = subtotal + shipping_cost

    # Generate order number
    import uuid
    order_number = f"ORD-{uuid.uuid4().hex[:8].upper()}"

    # Resolve payment method
    pm_map = {"mpesa": "mpesa", "paypal": "paypal", "card": "card", "cash": "cash"}
    from models.order import PaymentMethod as PM
    pm = PM[pm_map.get(request.paymentMethod or "mpesa", "mpesa")]

    # Create order with correct field names
    order = OrderModel(
        orderNumber=order_number,
        userId=current_user.id,
        status=OrderStatus.pending,
        shippingFullName=request.shippingFullName or "",
        shippingEmail=request.shippingEmail or "",
        shippingPhone=request.shippingPhone or "",
        shippingAddress=request.shippingAddress or request.shipping_address or "",
        shippingCity=request.shippingCity or "",
        shippingCounty=request.shippingCounty,
        shippingPostalCode=request.shippingPostalCode,
        shippingCountry=request.shippingCountry or "KE",
        subtotal=subtotal,
        shippingCost=shipping_cost,
        total=total,
        paymentMethod=pm,
    )
    db.add(order)
    db.commit()
    db.refresh(order)

    # Attach items to order
    for item in order_items:
        item.order_id = order.id
        db.add(item)

    db.commit()

    # Resolve seller: if any item is a listing, get that listing owner's openId
    seller_openid = None
    for item in order_items:
        if item.listing_id:
            # Trade-in listing — seller is the listing owner
            listing = db.query(TradeInListing).filter(TradeInListing.id == item.listing_id).first()
            if listing:
                seller_user = db.query(User).filter(User.id == listing.user_id).first()
                if seller_user:
                    seller_openid = seller_user.openId
            break
        elif item.product_id:
            # Regular product — seller is whoever owns the product
            product = db.query(ProductModel).filter(ProductModel.id == item.product_id).first()
            if product and hasattr(product, 'seller_openid') and product.seller_openid:
                seller_openid = product.seller_openid
            break
        
    return OrderResponse(
        id=order.id,
        user_id=order.userId,
        total_amount=float(order.total),
        status=order.status.value,
        shipping_address=order.shippingAddress,
        created_at=order.createdAt.isoformat(),
        seller_openid=str(seller_openid) if seller_openid else None,
        seller_id=str(seller_openid) if seller_openid else None,
        order_number=order.orderNumber,
    )

@router.get("", response_model=__import__("typing").List[__import__("routers.orders", fromlist=["OrderResponse"]).OrderResponse])
@router.get("/my-orders", response_model=List[OrderResponse])
async def get_my_orders(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    orders = db.query(OrderModel).filter(OrderModel.userId == current_user.id).all()
    return [
        OrderResponse(
            id=o.id,
            user_id=o.userId,
            total_amount=float(o.total),
            status=o.status.value,
            shipping_address=o.shippingAddress,
            created_at=o.createdAt.isoformat(),
        ) for o in orders
    ]


@router.get("/my", response_model=List[OrderResponse])
async def get_my_orders_alias(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return await get_my_orders(current_user=current_user, db=db)

@router.get("/{order_id}", response_model=OrderDetailResponse)
async def get_order_detail(order_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    order = db.query(OrderModel).filter(OrderModel.id == order_id, OrderModel.userId == current_user.id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    items = db.query(OrderItem).filter(OrderItem.order_id == order_id).all()
    item_details = [
        {
            "product_id": i.product_id or (1000000000 + i.listing_id if i.listing_id else None),
            "quantity": i.quantity,
            "price": float(i.unit_price),
            "product_name": i.product.name if i.product else (
                f"{i.listing.brand} {i.listing.model} (Used)" if i.listing else "Unknown"
            )
        } for i in items
    ]
    
    return OrderDetailResponse(
        id=order.id,
        user_id=order.userId,
        total_amount=float(order.total),
        status=order.status.value,
        shipping_address=order.shippingAddress,
        items=item_details,
        created_at=order.createdAt.isoformat()
    )


@router.get("/by-number/{order_number}")
async def get_order_by_number(order_number: str, db: Session = Depends(get_db)):
    """Public endpoint used by the storefront to fetch an order by its order number.
    Returns the same shape used by the frontend `OrderConfirmation` page.
    """
    order = db.query(OrderModel).filter(OrderModel.orderNumber == order_number).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    items = db.query(OrderItem).filter(OrderItem.order_id == order.id).all()
    item_details = [
        {
            "product_id": i.product_id or (1000000000 + i.listing_id if i.listing_id else None),
            "quantity": i.quantity,
            "price": float(i.unit_price),
            "product_name": i.product.name if i.product else (
                f"{i.listing.brand} {i.listing.model} (Used)" if i.listing else "Unknown"
            )
        } for i in items
    ]

    # No order history model exists; return empty list for now.
    history: list = []

    return {
        "order": {
            "id": order.id,
            "orderNumber": order.orderNumber,
            "status": order.status.value,
            "paymentStatus": getattr(order, 'paymentStatus', 'pending'),
            "paymentMethod": order.paymentMethod.name if hasattr(order, 'paymentMethod') and order.paymentMethod else None,
            "createdAt": order.createdAt.isoformat(),
            "estimatedDelivery": getattr(order, 'estimatedDelivery', None),
            "shippingFullName": order.shippingFullName,
            "shippingAddress": order.shippingAddress,
            "shippingCity": order.shippingCity,
            "shippingPostalCode": order.shippingPostalCode,
            "shippingCountry": order.shippingCountry,
            "shippingPhone": order.shippingPhone,
            "shippingEmail": order.shippingEmail,
            "subtotal": float(order.subtotal) if hasattr(order, 'subtotal') else 0,
            "shippingCost": float(order.shippingCost) if hasattr(order, 'shippingCost') else 0,
            "total": float(order.total) if hasattr(order, 'total') else 0,
            "userId": order.userId,
            "escrowId": getattr(order, 'escrowId', None),
        },
        "items": item_details,
        "history": history,
    }

@router.post("/cancel")
async def cancel_order_by_number(request: CancelOrderRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Allow frontend to cancel by orderNumber in body (legacy client behavior)
    order = db.query(OrderModel).filter(OrderModel.orderNumber == request.orderNumber, OrderModel.userId == current_user.id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.status != OrderStatus.pending:
        raise HTTPException(status_code=400, detail="Order cannot be cancelled")

    # Restore stock
    items = db.query(OrderItem).filter(OrderItem.order_id == order.id).all()
    for item in items:
        if item.product_id:
            product = db.query(ProductModel).filter(ProductModel.id == item.product_id).first()
            if product:
                product.stock_quantity += item.quantity

    order.status = OrderStatus.cancelled
    db.commit()
    return {"message": "Order cancelled"}


@router.post("/{order_id}/cancel")
async def cancel_order(order_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    order = db.query(OrderModel).filter(OrderModel.id == order_id, OrderModel.userId == current_user.id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.status != OrderStatus.pending:
        raise HTTPException(status_code=400, detail="Order cannot be cancelled")
    
    # Restore stock
    items = db.query(OrderItem).filter(OrderItem.order_id == order_id).all()
    for item in items:
        if item.product_id:
            product = db.query(ProductModel).filter(ProductModel.id == item.product_id).first()
            if product:
                product.stock_quantity += item.quantity
    
    order.status = OrderStatus.cancelled
    db.commit()
    return {"message": "Order cancelled"}
