from fastapi import APIRouter, Query, Depends, HTTPException
from pydantic import BaseModel
import json as _json
from typing import List, Optional
from sqlalchemy.orm import Session
from db.postgres import get_db
from models.product import Product as ProductModel, Review as ReviewModel, Category, Brand

router = APIRouter()

class ProductResponse(BaseModel):
    id: int
    name: str
    slug: str
    price: float
    description: Optional[str]
    images: Optional[List[str]] = []
    image_url: Optional[str] = None
    category: Optional[str]
    brand: Optional[str]
    stock_quantity: int

class ReviewResponse(BaseModel):
    id: int
    product_id: int
    user_id: int
    rating: int
    comment: Optional[str]

class AddReviewRequest(BaseModel):
    rating: int
    comment: Optional[str]

def _parse_images(raw) -> list:
    if isinstance(raw, list):
        return raw
    if isinstance(raw, str):
        try:
            parsed = _json.loads(raw)
            return parsed if isinstance(parsed, list) else []
        except Exception:
            return []
    return []

def map_product(p) -> ProductResponse:
    images = _parse_images(p.images)
    return ProductResponse(
        id=p.id, name=p.name, slug=p.slug, price=p.price,
        description=p.description, images=images,
        image_url=images[0] if images else None,
        category=p.category.name if p.category else None,
        brand=p.brand, stock_quantity=p.stock_quantity or 0
    )

@router.get("", response_model=List[ProductResponse])
@router.get("/", response_model=List[ProductResponse])
async def get_products(
    featured: bool = None,
    limit: int = Query(8),
    offset: int = Query(0),
    brand: Optional[str] = None,
    search: Optional[str] = None,
    category: Optional[str] = None,
    minPrice: Optional[float] = None,
    maxPrice: Optional[float] = None,
    sortBy: Optional[str] = None,
    tag: Optional[str] = None,
    categoryId: Optional[int] = None,
    db: Session = Depends(get_db)
):
    query = db.query(ProductModel).filter(ProductModel.is_active == True)
    if featured is not None:
        query = query.filter(ProductModel.featured == featured)
    if brand:
        query = query.filter(ProductModel.brand.ilike(brand))
    if search:
        query = query.filter(
            ProductModel.name.ilike(f"%{search}%") |
            ProductModel.description.ilike(f"%{search}%")
        )
    if categoryId is not None:
        query = query.filter(ProductModel.category_id == categoryId)
    if minPrice is not None:
        query = query.filter(ProductModel.price >= minPrice)
    if maxPrice is not None:
        query = query.filter(ProductModel.price <= maxPrice)
    if sortBy == "price_asc":
        query = query.order_by(ProductModel.price.asc())
    elif sortBy == "price_desc":
        query = query.order_by(ProductModel.price.desc())
    elif sortBy == "newest":
        query = query.order_by(ProductModel.id.desc())
    products = query.offset(offset).limit(limit).all()
    result = []
    for p in products:
        try:
            result.append(map_product(p))
        except Exception as e:
            print(f"Error mapping product {p.id}: {e}")
    return result

@router.get("/list", response_model=List[ProductResponse])
async def list_products(
    limit: int = Query(10),
    offset: int = Query(0),
    db: Session = Depends(get_db)
):
    products = db.query(ProductModel).filter(ProductModel.is_active == True).offset(offset).limit(limit).all()
    return [map_product(p) for p in products]

@router.get("/infinite")
async def infinite_products(
    cursor: Optional[int] = None,
    limit: int = 10,
    brand: Optional[str] = None,
    search: Optional[str] = None,
    minPrice: Optional[float] = None,
    maxPrice: Optional[float] = None,
    sortBy: Optional[str] = None,
    featured: bool = None,
    db: Session = Depends(get_db)
):
    start = cursor or 0
    query = db.query(ProductModel).filter(ProductModel.is_active == True)
    if featured is not None:
        query = query.filter(ProductModel.featured == featured)
    if brand:
        query = query.filter(ProductModel.brand.ilike(brand))
    if search:
        query = query.filter(
            ProductModel.name.ilike(f"%{search}%") |
            ProductModel.description.ilike(f"%{search}%")
        )
    if categoryId is not None:
        query = query.filter(ProductModel.category_id == categoryId)
    if minPrice is not None:
        query = query.filter(ProductModel.price >= minPrice)
    if maxPrice is not None:
        query = query.filter(ProductModel.price <= maxPrice)
    if sortBy == "price_asc":
        query = query.order_by(ProductModel.price.asc())
    elif sortBy == "price_desc":
        query = query.order_by(ProductModel.price.desc())
    elif sortBy == "newest":
        query = query.order_by(ProductModel.id.desc())
    products = query.offset(start).limit(limit).all()
    items = [map_product(p) for p in products]
    next_cursor = start + limit if len(products) == limit else None
    return {"items": items, "nextCursor": next_cursor}

@router.get("/by-slug/{slug}", response_model=ProductResponse)
async def get_product_by_slug(slug: str, db: Session = Depends(get_db)):
    product = db.query(ProductModel).filter(ProductModel.slug == slug, ProductModel.is_active == True).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return map_product(product)

@router.get("/facets")
async def get_facets(db: Session = Depends(get_db)):
    from sqlalchemy import func
    cat_counts = dict(
        db.query(ProductModel.category_id, func.count(ProductModel.id))
        .filter(ProductModel.is_active == True, ProductModel.category_id != None)
        .group_by(ProductModel.category_id).all()
    )
    brand_counts = dict(
        db.query(ProductModel.brand, func.count(ProductModel.id))
        .filter(ProductModel.is_active == True, ProductModel.brand != None)
        .group_by(ProductModel.brand).all()
    )
    return {
        "categories": cat_counts,
        "brands": brand_counts,
    }

@router.get("/{product_id}/reviews", response_model=List[ReviewResponse])
async def get_reviews(product_id: int, db: Session = Depends(get_db)):
    reviews = db.query(ReviewModel).filter(ReviewModel.product_id == product_id).all()
    return [ReviewResponse(id=r.id, product_id=r.product_id, user_id=r.user_id, rating=r.rating, comment=r.comment) for r in reviews]

@router.post("/{product_id}/reviews", response_model=ReviewResponse)
async def add_review(product_id: int, review: AddReviewRequest, current_user_id: int = 1, db: Session = Depends(get_db)):
    new_review = ReviewModel(product_id=product_id, user_id=current_user_id, rating=review.rating, comment=review.comment)
    db.add(new_review)
    db.commit()
    db.refresh(new_review)
    return ReviewResponse(id=new_review.id, product_id=new_review.product_id, user_id=new_review.user_id, rating=new_review.rating, comment=new_review.comment)
