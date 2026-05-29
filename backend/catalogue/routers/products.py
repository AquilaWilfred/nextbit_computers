from fastapi import APIRouter, Query, Depends, HTTPException
from pydantic import BaseModel
import json as _json
from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func
from db.postgres import get_db
from models.product import Product as ProductModel, Review as ReviewModel, Category, Brand
from models.listings.tradein import TradeInListing, ListingStatus, DeviceType, DEVICE_LABELS

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
    isTradeInListing: Optional[bool] = False

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
        normalized = []
        for item in raw:
            if isinstance(item, str):
                normalized.append(item)
            elif isinstance(item, dict):
                url = item.get("url") or item.get("src")
                if isinstance(url, str) and url:
                    normalized.append(url)
        return normalized
    if isinstance(raw, str):
        try:
            parsed = _json.loads(raw)
            return _parse_images(parsed)
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
        brand=p.brand, stock_quantity=p.stock_quantity or 0,
        isTradeInListing=False,
    )

DEVICE_CATEGORY_KEYWORDS = {
    DeviceType.LAPTOP: [
        "laptop",
        "laptops",
        "computer",
        "computers",
        "notebook",
        "notebooks",
        "pc",
        "pcs",
        "computers & laptops",
        "electronics",
    ],
    DeviceType.DESKTOP: [
        "desktop",
        "desktops",
        "computer",
        "computers",
        "pc",
        "pcs",
        "computers & laptops",
        "electronics",
    ],
    DeviceType.TABLET: [
        "tablet",
        "tablets",
        "computers & laptops",
        "electronics",
        "mobile",
        "mobiles",
        "tablet computers",
    ],
    DeviceType.PHONE: [
        "phone",
        "phones",
        "mobile",
        "mobiles",
        "smartphone",
        "smartphones",
        "electronics",
    ],
    DeviceType.MONITOR: [
        "monitor",
        "monitors",
        "screen",
        "display",
        "displays",
        "computers & laptops",
        "electronics",
    ],
    DeviceType.PRINTER: [
        "printer",
        "printers",
        "printing",
        "office",
        "electronics",
    ],
    DeviceType.HEADPHONES: [
        "headphone",
        "headphones",
        "audio",
        "headset",
        "headsets",
        "accessory",
        "accessories",
        "electronics",
    ],
    DeviceType.CAMERA: [
        "camera",
        "cameras",
        "photography",
        "photo",
        "dslr",
        "electronics",
    ],
    DeviceType.OTHER: [],
}


def listing_matches_category(device_type: DeviceType, category_names: List[str]) -> bool:
    if not category_names or device_type == DeviceType.OTHER:
        return True
    keywords = DEVICE_CATEGORY_KEYWORDS.get(device_type, [])
    lower_categories = [name.lower() for name in category_names]
    for category_name in lower_categories:
        for keyword in keywords:
            if keyword in category_name or category_name in keyword:
                return True
    return False


def map_listing_to_product(listing: TradeInListing, category_name: Optional[str] = None) -> ProductResponse:
    images = _parse_images(listing.images)
    return ProductResponse(
        id=1000000000 + listing.id,
        name=f"{listing.brand} {listing.model} (Used)",
        slug=f"listing-{listing.id}",
        price=float(listing.asking_price_kes),
        description=listing.specs,
        images=images,
        image_url=images[0] if images else None,
        category=category_name or DEVICE_LABELS.get(listing.device_type),
        brand=listing.brand,
        stock_quantity=1,
        isTradeInListing=True,
    )


def find_matching_category_name(device_type: DeviceType, category_names: List[str]) -> Optional[str]:
    for category_name in category_names:
        if listing_matches_category(device_type, [category_name]):
            return category_name
    return None


def merge_products_and_listings(
    products: List[ProductResponse],
    listings: List[ProductResponse],
    sortBy: Optional[str] = None,
) -> List[ProductResponse]:
    if sortBy in ("price_asc", "price_desc"):
        combined = products + listings
        return sorted(
            combined,
            key=lambda item: item.price,
            reverse=(sortBy == "price_desc"),
        )

    merged: List[ProductResponse] = []
    p_index = 0
    l_index = 0
    while p_index < len(products) or l_index < len(listings):
        if p_index < len(products):
            merged.append(products[p_index])
            p_index += 1
        if l_index < len(listings):
            merged.append(listings[l_index])
            l_index += 1
    return merged

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
    categoryId: Optional[List[int]] = Query(None),
    includeListings: bool = False,
    db: Session = Depends(get_db)
):
    category_names: List[str] = []
    if categoryId:
        category_names = [c.name for c in db.query(Category).filter(Category.id.in_(categoryId)).all() if c.name]

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
    if categoryId:
        query = query.filter(ProductModel.category_id.in_(categoryId))
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

    product_offset = 0 if includeListings else offset
    product_limit = limit if not includeListings else offset + limit
    products = query.offset(product_offset).limit(product_limit).all()
    items = [map_product(p) for p in products]

    if includeListings:
        listing_query = db.query(TradeInListing).filter(TradeInListing.status == ListingStatus.LISTED)
        if brand:
            listing_query = listing_query.filter(TradeInListing.brand.ilike(brand))
        if search:
            listing_query = listing_query.filter(
                TradeInListing.brand.ilike(f"%{search}%") |
                TradeInListing.model.ilike(f"%{search}%") |
                TradeInListing.specs.ilike(f"%{search}%") |
                TradeInListing.listing_number.ilike(f"%{search}%")
            )
        if minPrice is not None:
            listing_query = listing_query.filter(TradeInListing.asking_price_kes >= minPrice)
        if maxPrice is not None:
            listing_query = listing_query.filter(TradeInListing.asking_price_kes <= maxPrice)
        if category_names:
            allowed_types = [
                dt for dt in DeviceType
                if listing_matches_category(dt, category_names)
            ]
            if allowed_types:
                listing_query = listing_query.filter(TradeInListing.device_type.in_(allowed_types))
            else:
                listing_query = listing_query.filter(False)
        if sortBy == "price_asc":
            listing_query = listing_query.order_by(TradeInListing.asking_price_kes.asc())
        elif sortBy == "price_desc":
            listing_query = listing_query.order_by(TradeInListing.asking_price_kes.desc())
        else:
            listing_query = listing_query.order_by(TradeInListing.created_at.desc())

        listing_limit = offset + limit if offset else limit * 2
        listings = listing_query.offset(0).limit(listing_limit).all()
        listing_items = [
            map_listing_to_product(
                l,
                find_matching_category_name(l.device_type, category_names) if category_names else None,
            )
            for l in listings
        ]

        merged = merge_products_and_listings(items, listing_items, sortBy)
        return merged[offset:offset + limit]

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
    categoryId: Optional[List[int]] = Query(None),
    includeListings: bool = False,
    db: Session = Depends(get_db)
):
    start = cursor or 0
    category_names: List[str] = []
    if categoryId:
        category_names = [c.name for c in db.query(Category).filter(Category.id.in_(categoryId)).all() if c.name]

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
    if categoryId:
        query = query.filter(ProductModel.category_id.in_(categoryId))
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

    product_offset = 0 if includeListings else start
    product_limit = limit if not includeListings else start + limit
    products = query.offset(product_offset).limit(product_limit).all()
    items = [map_product(p) for p in products]

    if includeListings:
        listing_query = db.query(TradeInListing).filter(TradeInListing.status == ListingStatus.LISTED)
        if brand:
            listing_query = listing_query.filter(TradeInListing.brand.ilike(brand))
        if search:
            listing_query = listing_query.filter(
                TradeInListing.brand.ilike(f"%{search}%") |
                TradeInListing.model.ilike(f"%{search}%") |
                TradeInListing.specs.ilike(f"%{search}%") |
                TradeInListing.listing_number.ilike(f"%{search}%")
            )
        if minPrice is not None:
            listing_query = listing_query.filter(TradeInListing.asking_price_kes >= minPrice)
        if maxPrice is not None:
            listing_query = listing_query.filter(TradeInListing.asking_price_kes <= maxPrice)
        if category_names:
            allowed_types = [
                dt for dt in DeviceType
                if listing_matches_category(dt, category_names)
            ]
            if allowed_types:
                listing_query = listing_query.filter(TradeInListing.device_type.in_(allowed_types))
            else:
                listing_query = listing_query.filter(False)
        if sortBy == "price_asc":
            listing_query = listing_query.order_by(TradeInListing.asking_price_kes.asc())
        elif sortBy == "price_desc":
            listing_query = listing_query.order_by(TradeInListing.asking_price_kes.desc())
        else:
            listing_query = listing_query.order_by(TradeInListing.created_at.desc())

        # Fetch a larger window of listings so we can merge/interleave reliably
        listing_limit = start + limit if start else limit * 2
        listings = listing_query.offset(0).limit(listing_limit).all()
        listing_items = [
            map_listing_to_product(
                l,
                find_matching_category_name(l.device_type, category_names) if category_names else None,
            )
            for l in listings
        ]

        # For total count, count matching products and listings separately
        try:
            products_count = query.count()
        except Exception:
            products_count = len(products)
        try:
            listings_count = listing_query.count()
        except Exception:
            listings_count = len(listings)

        merged = merge_products_and_listings(items, listing_items, sortBy)
        sliced = merged[start:start + limit]
        next_cursor = start + limit if len(merged) > start + limit else None
        total = products_count + listings_count
        return {"items": sliced, "nextCursor": next_cursor, "total": total}

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
        # Merge in listed trade-in listings so facets include listings as well
    try:
        # Query listings (only listed)
        listing_q = db.query(TradeInListing).filter(TradeInListing.status == ListingStatus.LISTED)

        # Merge brand counts (case-insensitive merge)
        merged_brand_counts = {k: int(v) for k, v in brand_counts.items()}
        listing_brand_rows = listing_q.with_entities(TradeInListing.brand).all()
        for row in listing_brand_rows:
            b = row[0]
            if not b:
                continue
            found = next((k for k in merged_brand_counts.keys() if k and k.lower() == b.lower()), None)
            if found:
                merged_brand_counts[found] = merged_brand_counts.get(found, 0) + 1
            else:
                merged_brand_counts[b] = merged_brand_counts.get(b, 0) + 1

        # Merge category counts: map listing.device_type to category id when possible
        merged_cat_counts = {int(k): int(v) for k, v in cat_counts.items()}
        categories_list = db.query(Category).all()
        name_to_id = {c.name: c.id for c in categories_list if c.name}
        category_names = [c.name for c in categories_list if c.name]
        listing_device_rows = listing_q.with_entities(TradeInListing.device_type).all()
        for row in listing_device_rows:
            device_type = row[0]
            try:
                matched = find_matching_category_name(device_type, category_names)
                if matched:
                    cid = name_to_id.get(matched)
                    if cid:
                        merged_cat_counts[cid] = merged_cat_counts.get(cid, 0) + 1
            except Exception:
                # ignore mapping errors
                pass

        return {"categories": merged_cat_counts, "brands": merged_brand_counts}
    except Exception:
        return {"categories": cat_counts, "brands": brand_counts}

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
