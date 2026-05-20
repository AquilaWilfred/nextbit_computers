import random
import hashlib
from datetime import datetime, timedelta
from typing import Optional


def generate_card_number() -> tuple[str, str]:
    """Generate a virtual card number and return (full_number, last_four)"""
    prefix = "4532"
    parts = [str(random.randint(1000, 9999)) for _ in range(3)]
    last_four = str(random.randint(1000, 9999))
    full = f"{prefix} {parts[0]} {parts[1]} {last_four}"
    return full, last_four


def generate_expiry() -> tuple[str, str]:
    """Generate expiry month and year (5 years from now)"""
    now = datetime.now()
    expiry_date = now + timedelta(days=5 * 365)
    month = str(expiry_date.month).zfill(2)
    year = str(expiry_date.year % 100).zfill(2)
    return month, year


def generate_cvv() -> str:
    """Generate a random CVV"""
    return str(random.randint(100, 999))


def hash_cvv(cvv: str) -> str:
    """Hash CVV for storage"""
    return hashlib.sha256(cvv.encode()).hexdigest()


def calculate_risk_score(employment: str, income: Optional[float] = None) -> int:
    """Calculate risk score for application (0-100)"""
    base_score = {
        "employed": 20,
        "self-employed": 35,
        "retired": 50,
        "student": 65,
        "unemployed": 80,
    }
    score = base_score.get(employment, 50)
    return min(100, score)


def get_product_details(product_type: str) -> dict:
    """Get product details for card product"""
    products = {
        "e_nextbit": {
            "name": "E-NextBit Card",
            "annual_fee": 0,
            "foreign_txn_fee": 0,
            "atm_fee": 0,
            "cashback_rate": 1.0,
            "features": [
                "M-Pesa linked for instant transfers",
                "No annual fees",
                "Free ATM withdrawals at partner banks",
                "Mobile app for easy management",
                "Instant virtual card issuance",
            ],
            "benefits": [
                "Earn rewards on every NextBit purchase",
                "Cashback on M-Pesa transactions",
                "Instant loan access",
                "24/7 customer support",
            ],
            "requirements": [
                "Kenyan citizen or resident",
                "Valid ID number",
                "Active M-Pesa account",
                "Minimum age 18",
            ],
            "color_bg": "from-green-500 to-emerald-700",
            "color_accent": "bg-green-500",
        },
        "visa_cyber": {
            "name": "NextBit Visa Cyber",
            "annual_fee": 1999,
            "foreign_txn_fee": 0,
            "atm_fee": 0,
            "cashback_rate": 3.0,
            "features": [
                "Premium cyber-black design",
                "Contactless payments worldwide",
                "Free foreign transactions",
                "Exclusive cyber rewards",
                "Priority Pass lounge access",
            ],
            "benefits": [
                "3% cashback on online spending",
                "5x points on digital purchases",
                "Free cyber insurance",
                "Dedicated account manager",
            ],
            "requirements": [
                "Kenyan citizen or resident",
                "Valid ID number",
                "Proof of income",
                "Good credit history",
                "Minimum age 21",
            ],
            "color_bg": "from-cyan-500 to-blue-700",
            "color_accent": "bg-cyan-500",
        },
        "visa_black": {
            "name": "NextBit Visa Black",
            "annual_fee": 9999,
            "foreign_txn_fee": 0,
            "atm_fee": 0,
            "cashback_rate": 5.0,
            "features": [
                "Ultimate black card experience",
                "Infinite lounge access worldwide",
                "Personal concierge 24/7",
                "Luxury hotel benefits",
                "Exclusive event access",
            ],
            "benefits": [
                "5% unlimited cashback",
                "First-class travel insurance",
                "Private jet discounts",
                "Michelin star dining access",
                "Priority rewards multiplier",
            ],
            "requirements": [
                "Minimum annual income KES 2M",
                "Excellent credit score",
                "Premium customer history",
                "Invitation or application review",
            ],
            "color_bg": "from-purple-600 to-gray-900",
            "color_accent": "bg-purple-600",
        },
    }
    return products.get(product_type, products["e_nextbit"])