from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import text
from db.postgres import get_db

router = APIRouter(prefix="/api/analytics", tags=["analytics"])


@router.get("/network")
async def network_analytics(
    range_days: int = Query(default=30, le=365),
    db: Session = Depends(get_db),
):
    """
    Network-specific analytics: revenue per store, transfer volume,
    federation adoption, and a daily revenue trend.
    """
    try:
        # Revenue + order counts per branch
        store_rows = db.execute(text("""
            SELECT
                b.name                          AS store,
                COUNT(o.id)                     AS orders,
                COALESCE(SUM(o.total), 0)       AS revenue,
                COALESCE(AVG(o.total), 0)       AS aov
            FROM branches b
            LEFT JOIN orders o
                ON o.branch_id = b.id
                AND o.created_at >= NOW() - INTERVAL '1 day' * :days
                AND o.status NOT IN ('cancelled', 'refunded')
            GROUP BY b.id, b.name
            ORDER BY revenue DESC
        """), {"days": range_days}).mappings().all()

        # Daily revenue trend across all network stores
        trend_rows = db.execute(text("""
            SELECT
                DATE(o.created_at)              AS day,
                COUNT(o.id)                     AS orders,
                COALESCE(SUM(o.total), 0)       AS revenue
            FROM orders o
            WHERE o.created_at >= NOW() - INTERVAL '1 day' * :days
              AND o.status NOT IN ('cancelled', 'refunded')
            GROUP BY DATE(o.created_at)
            ORDER BY day ASC
        """), {"days": range_days}).mappings().all()

        # Federation adoption
        fed_rows = db.execute(text("""
            SELECT
                COUNT(*)                                        AS total,
                COUNT(*) FILTER (WHERE network_enabled = true) AS federated
            FROM branches
        """)).mappings().one()

        # Transfer volume
        try:
            xfer_rows = db.execute(text("""
                SELECT
                    COALESCE(COUNT(*), 0)                                           AS total,
                    COALESCE(COUNT(*) FILTER (WHERE status = 'completed'), 0)       AS completed,
                    COALESCE(COUNT(*) FILTER (WHERE status = 'pending'),   0)       AS pending,
                    COALESCE(COUNT(*) FILTER (WHERE status = 'conflict'),  0)       AS conflicts
                FROM inter_store_transfers
                WHERE created_at >= NOW() - INTERVAL '1 day' * :days
            """), {"days": range_days}).mappings().one()
            transfers = {
                "total":     int(xfer_rows["total"]),
                "completed": int(xfer_rows["completed"]),
                "pending":   int(xfer_rows["pending"]),
                "conflicts": int(xfer_rows["conflicts"]),
            }
        except Exception:
            transfers = {"total": 0, "completed": 0, "pending": 0, "conflicts": 0}

        return {
            "rangeDays": range_days,
            "storePerformance": [
                {
                    "store":   r["store"],
                    "orders":  int(r["orders"]),
                    "revenue": float(r["revenue"]),
                    "aov":     float(r["aov"]),
                }
                for r in store_rows
            ],
            "trend": [
                {
                    "day":     str(r["day"]),
                    "orders":  int(r["orders"]),
                    "revenue": float(r["revenue"]),
                }
                for r in trend_rows
            ],
            "federation": {
                "total":     int(fed_rows["total"]),
                "federated": int(fed_rows["federated"]),
            },
            "transfers": transfers,
        }

    except Exception as e:
        return {
            "rangeDays": range_days,
            "storePerformance": [],
            "trend": [],
            "federation": {"total": 0, "federated": 0},
            "transfers": {"total": 0, "completed": 0, "pending": 0, "conflicts": 0},
        }