from sqlalchemy import Column, Integer, String, Numeric, DateTime, ForeignKey, Enum, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from db.postgres import Base
import enum

class OrderStatus(enum.Enum):
    pending = "pending"
    confirmed = "confirmed"
    shipped = "shipped"
    delivered = "delivered"
    cancelled = "cancelled"

class PaymentMethod(enum.Enum):
    card = "card"
    paypal = "paypal"
    mpesa = "mpesa"
    cash = "cash"

class PaymentStatus(enum.Enum):
    pending = "pending"
    paid = "paid"
    failed = "failed"
    refunded = "refunded"

class Order(Base):
    __tablename__ = "orders"

    id                  = Column(Integer, primary_key=True, index=True)
    orderNumber         = Column("orderNumber", String(64), nullable=False, unique=True)
    userId              = Column("userId", Integer, ForeignKey("users.id"))
    status              = Column(Enum(OrderStatus), default=OrderStatus.pending, nullable=False)
    shippingFullName    = Column("shippingFullName", String(256), nullable=False, default="")
    shippingEmail       = Column("shippingEmail", String(320))
    shippingPhone       = Column("shippingPhone", String(32), nullable=False, default="")
    shippingAddress     = Column("shippingAddress", String, nullable=False, default="")
    shippingCity        = Column("shippingCity", String(128), nullable=False, default="")
    shippingCounty      = Column("shippingCounty", String(128))
    shippingPostalCode  = Column("shippingPostalCode", String(32))
    shippingCountry     = Column("shippingCountry", String(128), nullable=False, default="KE")
    subtotal            = Column(Numeric(10, 2), nullable=False, default=0)
    shippingCost        = Column("shippingCost", Numeric(10, 2), nullable=False, default=0)
    total               = Column(Numeric(10, 2), nullable=False, default=0)
    paymentMethod       = Column("paymentMethod", Enum(PaymentMethod))
    paymentStatus       = Column("paymentStatus", Enum(PaymentStatus), default=PaymentStatus.pending, nullable=False)
    paymentReference    = Column("paymentReference", String(256))
    trackingNumber      = Column("trackingNumber", String(128))
    estimatedDelivery   = Column("estimatedDelivery", DateTime)
    notes               = Column(String)
    abandonedEmailSent  = Column("abandonedEmailSent", Boolean, nullable=False, default=False)
    delivery_agent_id   = Column(Integer, ForeignKey("users.id"))
    delivery_otp        = Column(String(10))
    createdAt           = Column("createdAt", DateTime, nullable=False, server_default=func.now())
    updatedAt           = Column("updatedAt", DateTime, nullable=False, server_default=func.now(), onupdate=func.now())

    user  = relationship("User", foreign_keys=[userId])
    items = relationship("OrderItem", back_populates="order")

class WishlistItem(Base):
    __tablename__ = "wishlist_items"

    id         = Column(Integer, primary_key=True, index=True)
    user_id    = Column("user_id", Integer, ForeignKey("users.id"), nullable=False)
    product_id = Column("product_id", Integer, ForeignKey("products.id"), nullable=False)
    added_at   = Column("added_at", DateTime(timezone=True), server_default=func.now())

    user    = relationship("User")
    product = relationship("Product")

class CartItem(Base):
    __tablename__ = "cart_items"

    id         = Column(Integer, primary_key=True, index=True)
    user_id    = Column("userId", Integer, ForeignKey("users.id"), nullable=False)
    product_id = Column("productId", Integer, ForeignKey("products.id"), nullable=False)
    quantity   = Column(Integer, default=1, nullable=False)
    added_at   = Column("createdAt", DateTime, server_default=func.now())

    user    = relationship("User")
    product = relationship("Product")

class OrderItem(Base):
    __tablename__ = "order_items"

    id         = Column(Integer, primary_key=True, index=True)
    order_id   = Column("orderId", Integer, ForeignKey("orders.id"), nullable=False)
    product_id = Column("productId", Integer, ForeignKey("products.id"), nullable=False)
    quantity   = Column(Integer, nullable=False)
    unit_price = Column("unitPrice", Numeric(10, 2), nullable=False)

    order   = relationship("Order", back_populates="items")
    product = relationship("Product")
