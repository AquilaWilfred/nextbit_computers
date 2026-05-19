"""Seed a technician profile for local development.
Usage:
  python3 scripts/seed_technician.py [user_id]
Or set TECH_USER_ID env var.
"""
import os
import sys
from db.postgres import SessionLocal
from models.technician import TechnicianProfile
from models.auth import User


def main():
    user_id = int(sys.argv[1]) if len(sys.argv) > 1 else int(os.environ.get("TECH_USER_ID", "12"))
    db = SessionLocal()
    try:
        existing = db.query(TechnicianProfile).filter(TechnicianProfile.user_id == user_id).first()
        if existing:
            print(f"Technician profile already exists for user_id={user_id} (id={existing.id})")
            return

        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            # Create a lightweight user record for dev if missing
            user = User(id=user_id, email=f"tech{user_id}@example.com", name=f"Tech {user_id}", password=None, phone="0712000000")
            db.add(user)
            db.commit()
            print(f"Created user id={user_id}")

        tech = TechnicianProfile(
            user_id=user_id,
            iprs_verified=True,
            insured=False,
            location="Development Base",
            bio="Seeded technician profile for local development.",
            specialties=["Laptop", "Screen"],
            min_price=1500.0,
            warranty_days=30,
            service_radius=10,
            available=True,
            rating=0.0,
            review_count=0,
        )
        db.add(tech)
        db.commit()
        db.refresh(tech)
        print(f"Created technician profile id={tech.id} for user_id={user_id}")
    except Exception as e:
        print("Error seeding technician:", e)
    finally:
        db.close()


if __name__ == '__main__':
    main()
