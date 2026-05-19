from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import text
from db.postgres import get_db

router = APIRouter()


@router.get("/summary")
async def network_summary(db: Session = Depends(get_db)):
    try:
        rows = db.execute(text("""
            SELECT
                COUNT(*)                                            AS total_stores,
                COUNT(*) FILTER (WHERE network_enabled = true)     AS active_in_network,
                COUNT(*) FILTER (WHERE network_status = 'pending') AS pending_requests,
                0                                                  AS inter_store_transfers,
                0                                                  AS total_network_stock,
                0                                                  AS conflict_flags
            FROM branches
        """)).mappings().one()
        return {
            "totalStores":         int(rows["total_stores"]),
            "activeInNetwork":     int(rows["active_in_network"]),
            "pendingRequests":     int(rows["pending_requests"]),
            "interStoreTransfers": int(rows["inter_store_transfers"]),
            "totalNetworkStock":   int(rows["total_network_stock"]),
            "conflictFlags":       int(rows["conflict_flags"]),
            "networkRevenue":      0.0,
            "networkUptime":       "99.9%",
        }
    except Exception:
        return {
            "totalStores": 0, "activeInNetwork": 0, "pendingRequests": 0,
            "interStoreTransfers": 0, "totalNetworkStock": 0, "conflictFlags": 0,
            "networkRevenue": 0.0, "networkUptime": "—",
        }


@router.get("/stores")
async def network_stores(db: Session = Depends(get_db)):
    try:
        rows = db.execute(text("""
            SELECT
                id::text,
                name,
                COALESCE(address, '')           AS address,
                COALESCE(network_status, 'active') AS status,
                COALESCE(network_enabled, false)   AS inventory_shared,
                COALESCE(created_at, NOW())        AS joined_at,
                0                                  AS total_orders,
                5.0                                AS rating
            FROM branches
            ORDER BY created_at DESC
        """)).mappings().all()
        return [
            {
                "id":             r["id"],
                "name":           r["name"],
                "address":        r["address"],
                "status":         r["status"],
                "inventoryShared": r["inventory_shared"],
                "joinedAt":       r["joined_at"].isoformat() if hasattr(r["joined_at"], "isoformat") else str(r["joined_at"]),
                "totalOrders":    0,
                "rating":         5.0,
            }
            for r in rows
        ]
    except Exception:
        return []


@router.get("/transfers")
async def network_transfers(limit: int = Query(default=20, le=100), db: Session = Depends(get_db)):
    try:
        rows = db.execute(text("""
            SELECT
                t.id::text,
                bf.name AS from_store,
                bt.name AS to_store,
                p.name  AS product,
                t.quantity,
                COALESCE(t.status, 'pending') AS status,
                t.created_at
            FROM inter_store_transfers t
            JOIN branches bf ON bf.id = t.from_branch_id
            JOIN branches bt ON bt.id = t.to_branch_id
            JOIN products p  ON p.id  = t.product_id
            ORDER BY t.created_at DESC
            LIMIT :limit
        """), {"limit": limit}).mappings().all()
        return [
            {
                "id":        r["id"],
                "fromStore": r["from_store"],
                "toStore":   r["to_store"],
                "product":   r["product"],
                "quantity":  r["quantity"],
                "status":    r["status"],
                "createdAt": r["created_at"].isoformat() if hasattr(r["created_at"], "isoformat") else str(r["created_at"]),
            }
            for r in rows
        ]
    except Exception:
        return []


@router.post("/stores/{store_id}/approve")
async def approve_store(store_id: str, db: Session = Depends(get_db)):
    db.execute(text("UPDATE branches SET network_status = 'active' WHERE id = :id"), {"id": store_id})
    db.commit()
    return {"ok": True}


@router.post("/stores/{store_id}/reject")
async def reject_store(store_id: str, db: Session = Depends(get_db)):
    db.execute(text("UPDATE branches SET network_status = 'suspended' WHERE id = :id"), {"id": store_id})
    db.commit()
    return {"ok": True}


@router.post("/stores/{store_id}/federation")
async def toggle_federation(store_id: str, db: Session = Depends(get_db)):
    db.execute(text("UPDATE branches SET network_enabled = NOT COALESCE(network_enabled, false) WHERE id = :id"), {"id": store_id})
    db.commit()
    return {"ok": True}


@router.post("/toggle")
async def toggle_network(db: Session = Depends(get_db)):
    row = db.execute(text("SELECT value FROM settings WHERE key = 'network_enabled'")).mappings().first()
    current = (row["value"] == "true") if row else True
    new_val = "false" if current else "true"
    db.execute(text("""
        INSERT INTO settings (key, value) VALUES ('network_enabled', :v)
        ON CONFLICT (key) DO UPDATE SET value = :v
    """), {"v": new_val})
    db.commit()
    return {"networkEnabled": not current}
