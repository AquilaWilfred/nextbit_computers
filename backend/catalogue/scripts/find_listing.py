import os
import sys
from db.postgres import SessionLocal
from models.listings.tradein import TradeInListing

LISTING_NUMBER = sys.argv[1] if len(sys.argv) > 1 else "TI-2026-06351"

if __name__ == '__main__':
    db = SessionLocal()
    try:
        listing = db.query(TradeInListing).filter(TradeInListing.listing_number == LISTING_NUMBER).first()
        if not listing:
            print(f"Listing {LISTING_NUMBER} not found")
            sys.exit(2)
        print("Found listing:")
        print(f"id: {listing.id}")
        print(f"listing_number: {listing.listing_number}")
        print(f"brand/model: {listing.brand} {listing.model}")
        print("images raw repr:")
        print(repr(listing.images))
        print("images type:", type(listing.images))
        # If JSON stored as string inside array, print first element and its type
        if listing.images:
            print("first element repr:", repr(listing.images[0]))
            print("first element type:", type(listing.images[0]))
    except Exception as e:
        print("Error:", e)
    finally:
        db.close()
