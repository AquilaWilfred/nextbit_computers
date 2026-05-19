from models.auth import User
from sqlalchemy import Column, Integer, String, Float, Text, Boolean, DateTime, ForeignKey, JSON
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from db.postgres import Base

class Product(Base):
    __tablename__ = "products"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    slug = Column(String, unique=True, index=True, nullable=False)
    description = Column(Text)
    shortDescription = Column("shortDescription", Text)
    price = Column(Float, nullable=False)
    comparePrice = Column("comparePrice", Float)
    image_url = Column(String)
    images = Column(ARRAY(String), nullable=True, default=list)
    category_id = Column("categoryId", Integer, ForeignKey("categories.id"))
    brand = Column("brand", String)
    stock_quantity = Column("stock", Integer, default=0)
    sku = Column(String)
    specifications = Column(JSON)
    tags = Column(JSON)
    rating = Column(String)
    reviewCount = Column("reviewCount", Integer, default=0)
    featured = Column(Boolean, default=False)
    is_active = Column("active", Boolean, default=True)
    created_at = Column("createdAt", DateTime(timezone=True), server_default=func.now())
    updated_at = Column("updatedAt", DateTime(timezone=True), onupdate=func.now())
    category = relationship("Category")
    reviews = relationship("Review", back_populates="product")

class Category(Base):
    __tablename__ = "categories"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    slug = Column(String, unique=True, index=True, nullable=False)
    description = Column(Text)
    parentId = Column("parentId", Integer, ForeignKey("categories.id"), nullable=True)
    featured = Column(Boolean, default=False)
    active = Column(Boolean, default=True)
    icon = Column(String)
    imageUrl = Column("imageUrl", String)
    order = Column("order", Integer, default=0)
    created_at = Column("createdAt", DateTime(timezone=True), server_default=func.now())

class Brand(Base):
    __tablename__ = "brands"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    slug = Column(String, unique=True, index=True, nullable=False)
    description = Column(Text)

class Branch(Base):
    __tablename__ = "branches"
    id        = Column(Integer, primary_key=True, index=True)
    name      = Column(String, nullable=False)
    address   = Column(String)
    phone     = Column(String)
    email     = Column(String)
    latitude  = Column(Float)
    longitude = Column(Float)
    is_main   = Column("isMain", Boolean, default=False)
    is_active = Column("active", Boolean, default=True)
    hours     = Column(JSON)

class Review(Base):
    __tablename__ = "reviews"
    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    rating = Column(Integer, nullable=False)
    comment = Column(Text)
    created_at = Column("createdAt", DateTime(timezone=True), server_default=func.now())
    product = relationship("Product", back_populates="reviews")
    user = relationship("User")
