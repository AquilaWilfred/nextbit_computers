import math

def optimize_inventory(
    current_stock: int,
    daily_sales_rate: float,
    lead_time_days: int,
) -> dict:
    """
    Economic Order Quantity (EOQ) model.
    """
    reorder_point = math.ceil(daily_sales_rate * lead_time_days * 1.2)
    optimal_order_quantity = max(10, math.ceil(daily_sales_rate * 30))
    days_until_stockout = round(current_stock / daily_sales_rate, 1)

    if current_stock <= reorder_point:
        action = f"REORDER NOW — order {optimal_order_quantity} units"
    elif days_until_stockout < lead_time_days * 1.5:
        action = f"Reorder soon — {days_until_stockout} days of stock remaining"
    else:
        action = "Stock levels healthy"

    return {
        "reorder_point": reorder_point,
        "optimal_order_quantity": optimal_order_quantity,
        "days_until_stockout": days_until_stockout,
        "action": action,
    }
