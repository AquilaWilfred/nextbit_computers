from datetime import datetime
import random
import string
from models.ewaste.ewaste import (
    DeviceCategory, CATEGORY_POINTS, CATEGORY_HAZARDOUS,
    ComplianceStandard, TicketStatus
)


def calculate_points(category: DeviceCategory) -> int:
    """Calculate points awarded for a device category"""
    return CATEGORY_POINTS.get(category, 50)


def calculate_co2_saved(weight_kg: float) -> int:
    """Calculate CO2 saved based on weight (approx 80kg CO2 per kg e-waste)"""
    return int(weight_kg * 80)


def get_hazardous_materials(category: DeviceCategory) -> list:
    """Get hazardous materials for a device category"""
    return CATEGORY_HAZARDOUS.get(category, ["Mixed e-waste"])


def generate_ticket_number() -> str:
    """Generate a unique ticket number"""
    year = datetime.now().year
    random_num = ''.join(random.choices(string.digits, k=5))
    return f"EW-{year}-{random_num}"


def generate_certificate_number(standard: ComplianceStandard, ticket_id: int) -> str:
    """Generate a certificate number"""
    year = datetime.now().year
    prefix_map = {
        ComplianceStandard.NEMA: "NEMA",
        ComplianceStandard.EU_WEEE: "WEEE",
        ComplianceStandard.BASEL: "BASEL",
        ComplianceStandard.ISO_14001: "ISO",
        ComplianceStandard.ROHS: "ROHS",
    }
    prefix = prefix_map.get(standard, "CERT")
    return f"{prefix}/{year}/{ticket_id}/{random.randint(1000, 9999)}"


def get_next_status(current_status: TicketStatus) -> TicketStatus:
    """Get the next status in the workflow"""
    status_flow = {
        TicketStatus.SURRENDERED: TicketStatus.BATCHED,
        TicketStatus.BATCHED: TicketStatus.COLLECTED,
        TicketStatus.COLLECTED: TicketStatus.CERTIFIED,
        TicketStatus.CERTIFIED: TicketStatus.RECYCLED,
    }
    return status_flow.get(current_status, current_status)


def update_user_stats_on_ticket_creation(user_id: int, points: int, co2: int, weight: float):
    """Helper to update user stats - will be called in service layer"""
    # This is just a helper; actual update happens in the service
    pass


def get_recycler_certifications(recycler_name: str) -> list:
    """Get certifications for a recycler (mock - would come from DB)"""
    certs_map = {
        "NextBit Green Hub": ["NEMA", "ISO 14001", "EU WEEE"],
        "EcoTech International": ["NEMA", "Basel Convention", "R2 Certified"],
        "KENSAGE e-Waste Management": ["NEMA", "ISO 14001", "RoHS Compliant"],
        "WEEE Recycling Solutions": ["EU WEEE", "Basel Convention", "NEMA"],
    }
    return certs_map.get(recycler_name, ["NEMA"])