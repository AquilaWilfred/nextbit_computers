def suggest_price(cost_price: float, category: str, current_stock: int) -> dict:
    """
    Placeholder pricing engine.
    Replace with regression model trained on market data.
    """
    margins = {
        "laptop": 0.18,
        "desktop": 0.15,
        "components": 0.25,
        "peripherals": 0.30,
    }
    margin = margins.get(category.lower(), 0.20)

    # Reduce margin slightly if overstocked
    if current_stock > 50:
        margin -= 0.03

    suggested_price = cost_price * (1 + margin)

    return {
        "suggested_price": round(suggested_price, 2),
        "margin_percent": round(margin * 100, 1),
        "strategy": "competitive" if current_stock > 50 else "standard",
    }
