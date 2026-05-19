from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import text
from db.postgres import get_db
from routers.auth import get_current_user

router = APIRouter()

class AddressIn(BaseModel):
    fullName: str
    phone: str
    addressLine: str
    city: str
    postalCode: Optional[str] = None
    country: str = "Kenya"
    isDefault: Optional[bool] = False

class AddressOut(AddressIn):
    id: int

@router.get("", response_model=List[AddressOut])
async def list_addresses(
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    rows = db.execute(text("""
        SELECT id, full_name AS "fullName", phone, address_line AS "addressLine",
               city, postal_code AS "postalCode", country, is_default AS "isDefault"
        FROM addresses WHERE user_id = :uid ORDER BY is_default DESC, id DESC
    """), {"uid": user.id}).mappings().fetchall()
    return [dict(r) for r in rows]

@router.post("", response_model=AddressOut)
async def create_address(
    body: AddressIn,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    if body.isDefault:
        db.execute(text(
            "UPDATE addresses SET is_default = false WHERE user_id = :uid"
        ), {"uid": user.id})

    row = db.execute(text("""
        INSERT INTO addresses (user_id, full_name, phone, address_line, city,
                               postal_code, country, is_default)
        VALUES (:uid, :fn, :ph, :al, :ci, :pc, :co, :df)
        RETURNING id, full_name AS "fullName", phone, address_line AS "addressLine",
                  city, postal_code AS "postalCode", country, is_default AS "isDefault"
    """), {
        "uid": user.id, "fn": body.fullName, "ph": body.phone,
        "al": body.addressLine, "ci": body.city, "pc": body.postalCode,
        "co": body.country, "df": body.isDefault,
    }).mappings().fetchone()
    db.commit()
    return dict(row)

@router.patch("/{address_id}", response_model=AddressOut)
async def update_address(
    address_id: int,
    body: AddressIn,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    if body.isDefault:
        db.execute(text(
            "UPDATE addresses SET is_default = false WHERE user_id = :uid"
        ), {"uid": user.id})

    row = db.execute(text("""
        UPDATE addresses SET full_name=:fn, phone=:ph, address_line=:al,
               city=:ci, postal_code=:pc, country=:co, is_default=:df
        WHERE id=:id AND user_id=:uid
        RETURNING id, full_name AS "fullName", phone, address_line AS "addressLine",
                  city, postal_code AS "postalCode", country, is_default AS "isDefault"
    """), {
        "id": address_id, "uid": user.id, "fn": body.fullName,
        "ph": body.phone, "al": body.addressLine, "ci": body.city,
        "pc": body.postalCode, "co": body.country, "df": body.isDefault,
    }).mappings().fetchone()
    db.commit()
    if not row:
        raise HTTPException(404, "Address not found")
    return dict(row)

@router.delete("/{address_id}")
async def delete_address(
    address_id: int,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    result = db.execute(text(
        "DELETE FROM addresses WHERE id=:id AND user_id=:uid RETURNING id"
    ), {"id": address_id, "uid": user.id})
    db.commit()
    if not result.fetchone():
        raise HTTPException(404, "Address not found")
    return {"success": True}
