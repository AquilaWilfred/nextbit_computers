from datetime import datetime, timedelta
import random
import string
from models.insurance.insurance import InsuranceType


PRODUCT_DETAILS = {
    InsuranceType.GOODS_IN_TRANSIT: {
        "name": "Goods-in-Transit Insurance",
        "description": "Automatic coverage for every delivery, protecting against loss, damage, or theft during transit.",
        "coverage_amount": 50000,
        "premium_amount": 500,
        "premium_period": "one-time",
        "duration_days": 14,
        "features": [
            "Coverage for loss during transit",
            "Damage protection",
            "Theft coverage",
            "Automatic with every order",
        ],
    },
    InsuranceType.DEVICE_PROTECTION: {
        "name": "Device Protection Plan",
        "description": "Extended warranty and protection for your devices against accidental damage and theft.",
        "coverage_amount": 100000,
        "premium_amount": 2000,
        "premium_period": "yearly",
        "duration_days": 365,
        "features": [
            "Accidental damage coverage",
            "Theft protection",
            "Extended warranty",
            "Free diagnostic service",
        ],
    },
}


def generate_policy_number() -> str:
    """Generate a unique policy number"""
    year = datetime.now().year
    random_num = ''.join(random.choices(string.digits, k=6))
    return f"POL-{year}-{random_num}"


def generate_claim_number() -> str:
    """Generate a unique claim number"""
    year = datetime.now().year
    random_num = ''.join(random.choices(string.digits, k=6))
    return f"CLM-{year}-{random_num}"


def get_product_details(insurance_type: InsuranceType) -> dict:
    """Get product details for an insurance type"""
    return PRODUCT_DETAILS.get(insurance_type, PRODUCT_DETAILS[InsuranceType.GOODS_IN_TRANSIT])


def calculate_expiry_date(insurance_type: InsuranceType) -> datetime:
    """Calculate expiry date based on insurance type"""
    product = get_product_details(insurance_type)
    return datetime.now() + timedelta(days=product["duration_days"])


def seed_insurance_products(db_session):
    """Seed insurance products if none exist"""
    from models.insurance.insurance import InsuranceProduct
    
    if db_session.query(InsuranceProduct).count() > 0:
        return
    
    for insurance_type, details in PRODUCT_DETAILS.items():
        product = InsuranceProduct(
            type=insurance_type,
            name=details["name"],
            description=details["description"],
            coverage_amount=details["coverage_amount"],
            premium_amount=details["premium_amount"],
            premium_period=details["premium_period"],
            duration_days=details["duration_days"],
            features=details["features"],
        )
        db_session.add(product)
    db_session.commit()