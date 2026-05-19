from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from db.postgres import get_db

router = APIRouter()

@router.get("")
@router.get("/")
async def list_branches(db: Session = Depends(get_db)):
    rows = db.execute(text(
        'SELECT id, name, address, phone, email, latitude, longitude, "isMain", active, hours '
        'FROM branches WHERE active = true ORDER BY id'
    )).mappings().fetchall()
    return [
        {
            "id": r["id"],
            "name": r["name"],
            "address": r["address"] or "",
            "phone": r["phone"] or "",
            "email": r["email"] or "",
            "lat": str(r["latitude"] or 0),
            "lng": str(r["longitude"] or 0),
            "isMain": r["isMain"] or False,
            "active": r["active"],
            "hours": r["hours"] or [],
        }
        for r in rows
    ]