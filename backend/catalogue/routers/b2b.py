from fastapi import APIRouter, Body, Depends, HTTPException, BackgroundTasks, Request, Query
from fastapi.responses import Response
from routers.auth import get_current_user_optional
from sqlalchemy.orm import Session
from sqlalchemy import select, update, func, or_
from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime, timedelta
from uuid import uuid4
import string, random

from db.postgres import get_db, SessionLocal
from models.auth import User
from models.b2b import B2BApplication, B2BDocument
from models.lpo import LPO as LPOModel, LPOItem, LPOAuditLog, LPOStatus
from models.invoice import Invoice, InvoiceItem, InvoiceStatus, PaymentMethod
from models.credit import CreditAccount, PaymentTerms
from models.product import Product
from models.supplier import Supplier
from app.auth_utils import get_password_hash
# Email stub — replace with real implementation
async def send_email(to: str, subject: str, template: str, context: dict):
    print(f"[EMAIL] to={to} subject={subject} template={template}")  # your existing email helper

router = APIRouter()

# ── Pydantic schemas ──────────────────────────────────────────────────────────

class CompanyInfo(BaseModel):
    companyName: str
    kraPin: str
    registrationNumber: str
    vatNumber: Optional[str] = None
    industry: str
    website: Optional[str] = None
    physicalAddress: str
    postalAddress: Optional[str] = None
    city: str
    country: str = "Kenya"

class ContactInfo(BaseModel):
    fullName: str
    title: Optional[str] = None
    email: EmailStr
    phone: str
    department: Optional[str] = None

class RegisterPayload(BaseModel):
    companyInfo: CompanyInfo
    primaryContact: ContactInfo
    financeContact: ContactInfo
    documentUrls: dict[str, str]  # { "kra_pin_cert": "https://r2.../..." }

class StatusUpdate(BaseModel):
    status: str  # pending | under_review | approved | rejected | more_info_needed
    notes: Optional[str] = None
    creditLimit: Optional[int] = None
    paymentTerms: Optional[str] = None
    reviewedBy: Optional[str] = None

class VerifyDocPayload(BaseModel):
    verified: bool
    verifiedBy: Optional[str] = None

# ── Helpers ───────────────────────────────────────────────────────────────────

def _gen_ref() -> str:
    """Generate a human-readable reference like NB-B2B-2024-A3K9"""
    year = datetime.utcnow().year
    suffix = "".join(random.choices(string.ascii_uppercase + string.digits, k=4))
    return f"NB-B2B-{year}-{suffix}"

def _format_date(value: Optional[object]) -> str:
    if value is None:
        return "N/A"
    if hasattr(value, "isoformat"):
        return value.isoformat()
    return str(value)

DOC_LABELS = {
    "cert_of_incorporation": "Certificate of Incorporation",
    "kra_pin_cert":          "KRA PIN Certificate",
    "cr12":                  "CR12 — Current Directors",
    "vat_cert":              "VAT Registration Certificate",
    "bank_reference":        "Bank Reference Letter",
    "company_profile":       "Company Profile",
}

def _get_approved_b2b_app_for_user(db: Session, current_user) -> Optional[B2BApplication]:
    if not current_user:
        return None

    return db.query(B2BApplication).filter(
        B2BApplication.status == "approved",
        or_(
            B2BApplication.user_id == current_user.id,
            B2BApplication.primary_contact_email == current_user.email,
        ),
    ).first()

# ── Registration ──────────────────────────────────────────────────────────────

@router.post("/register")
def register_b2b(
    payload: RegisterPayload,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user_optional),
):
    # Prevent duplicate KRA PIN applications
    existing = db.execute(
        select(B2BApplication).where(
            B2BApplication.kra_pin == payload.companyInfo.kraPin,
            B2BApplication.status.notin_(["rejected"]),
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(409, "An application with this KRA PIN already exists.")

    linked_user_id = current_user.id if current_user else None
    if linked_user_id is None:
        existing_user = db.query(User).filter(User.email == payload.primaryContact.email).first()
        linked_user_id = existing_user.id if existing_user else None

    ref = _gen_ref()
    app = B2BApplication(
        id=str(uuid4()),
        reference_number=ref,
        user_id=linked_user_id,
        status="pending",
        company_name=payload.companyInfo.companyName,
        kra_pin=payload.companyInfo.kraPin,
        registration_number=payload.companyInfo.registrationNumber,
        vat_number=payload.companyInfo.vatNumber,
        industry=payload.companyInfo.industry,
        website=payload.companyInfo.website,
        physical_address=payload.companyInfo.physicalAddress,
        postal_address=payload.companyInfo.postalAddress,
        city=payload.companyInfo.city,
        country=payload.companyInfo.country,
        primary_contact_name=payload.primaryContact.fullName,
        primary_contact_title=payload.primaryContact.title,
        primary_contact_email=payload.primaryContact.email,
        primary_contact_phone=payload.primaryContact.phone,
        primary_contact_dept=payload.primaryContact.department,
        finance_contact_name=payload.financeContact.fullName,
        finance_contact_email=payload.financeContact.email,
        finance_contact_phone=payload.financeContact.phone,
    )
    db.add(app)
    db.flush()  # get the id before adding children

    for doc_key, url in payload.documentUrls.items():
        doc = B2BDocument(
            id=str(uuid4()),
            application_id=app.id,
            doc_key=doc_key,
            label=DOC_LABELS.get(doc_key, doc_key),
            url=url,
            verified=False,
        )
        db.add(doc)

    db.commit()

    # Fire-and-forget emails
    background_tasks.add_task(
        send_email,
        to=payload.primaryContact.email,
        subject=f"NextBit B2B Application Received — {ref}",
        template="b2b_application_received",
        context={"name": payload.primaryContact.fullName, "ref": ref},
    )
    background_tasks.add_task(
        send_email,
        to="b2b@nextbit.co.ke",  # internal admin notification
        subject=f"New B2B Application: {payload.companyInfo.companyName} ({ref})",
        template="b2b_admin_notification",
        context={"company": payload.companyInfo.companyName, "ref": ref},
    )

    return {"referenceNumber": ref}

# ── Admin: list applications ──────────────────────────────────────────────────

@router.get("/applications")
def list_applications(db: Session = Depends(get_db)):
    result = db.execute(
        select(B2BApplication).order_by(B2BApplication.submitted_at.desc())
    )
    apps = result.scalars().all()

    out = []
    for app in apps:
        docs_result = db.execute(
            select(B2BDocument).where(B2BDocument.application_id == app.id)
        )
        docs = docs_result.scalars().all()
        out.append(_serialize_app(app, docs))

    return out

# ── Admin: update status ──────────────────────────────────────────────────────

@router.post("/applications/{app_id}/status")
def update_status(
    app_id: str,
    body: StatusUpdate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    app = db.get(B2BApplication, app_id)
    if not app:
        raise HTTPException(404, "Application not found")

    app.status = body.status
    app.review_notes = body.notes
    app.reviewed_by = body.reviewedBy
    app.updated_at = datetime.utcnow()

    if body.status == "approved":
        app.credit_limit = body.creditLimit
        app.payment_terms = body.paymentTerms

        credit_account = db.query(CreditAccount).filter(CreditAccount.company_id == app.id).first()
        payment_terms = PaymentTerms(body.paymentTerms) if body.paymentTerms else PaymentTerms.net_30
        if credit_account is None:
            credit_account = CreditAccount(
                id=str(uuid4()),
                company_id=app.id,
                credit_limit=body.creditLimit or 0,
                available_credit=body.creditLimit or 0,
                payment_terms=payment_terms,
            )
        else:
            credit_account.credit_limit = body.creditLimit or credit_account.credit_limit
            credit_account.available_credit = body.creditLimit or credit_account.available_credit
            credit_account.payment_terms = payment_terms
        db.add(credit_account)

        # Create the B2B company account so they can log in
        background_tasks.add_task(_activate_company_account, app_id, app.primary_contact_email)

    db.commit()

    # Email the applicant
    if body.status in ("approved", "rejected", "more_info_needed"):
        background_tasks.add_task(
            send_email,
            to=app.primary_contact_email,
            subject=_status_email_subject(body.status, app.reference_number),
            template=f"b2b_application_{body.status}",
            context={
                "name": app.primary_contact_name,
                "ref": app.reference_number,
                "notes": body.notes or "",
                "credit_limit": body.creditLimit,
                "payment_terms": body.paymentTerms,
            },
        )

    return {"ok": True}

# ── Admin: verify / unverify a document ──────────────────────────────────────

@router.post("/applications/{app_id}/documents/{doc_key}/verify")
def verify_document(
    app_id: str,
    doc_key: str,
    body: VerifyDocPayload,
    db: Session = Depends(get_db),
):
    result = db.execute(
        select(B2BDocument).where(
            B2BDocument.application_id == app_id,
            B2BDocument.doc_key == doc_key,
        )
    )
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(404, "Document not found")

    doc.verified = body.verified
    doc.verified_by = body.verifiedBy
    doc.verified_at = datetime.utcnow() if body.verified else None
    db.commit()

    return {"ok": True}

# ── Portal: summary ───────────────────────────────────────────────────────────

@router.get("/summary")
async def b2b_summary(request: Request, db: Session = Depends(get_db), current_user=Depends(get_current_user_optional)):
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    app = _get_approved_b2b_app_for_user(db, current_user)
    lpo_query = db.query(LPOModel)
    if app:
        lpo_query = lpo_query.filter(LPOModel.company_id == app.id)
    else:
        lpo_query = lpo_query.filter(LPOModel.created_by == current_user.email)

    lpos = lpo_query.order_by(LPOModel.updated_at.desc()).all()
    total_orders = len(lpos)
    open_lpos = sum(1 for l in lpos if l.status in (LPOStatus.draft, LPOStatus.submitted))
    pending_approval = sum(1 for l in lpos if l.status == LPOStatus.submitted)
    total_spend = sum((l.amount or 0) + (l.tax_amount or 0) for l in lpos)
    active_suppliers = len({l.company for l in lpos if l.company})
    last_activity = lpos[0].updated_at.isoformat() if lpos else "—"

    return {
        "totalOrders": total_orders,
        "pendingApproval": pending_approval,
        "totalSpend": total_spend,
        "totalSaved": 0,
        "currency": "KES",
        "openLPOs": open_lpos,
        "activeSuppliers": active_suppliers,
        "lastActivity": last_activity,
    }

# ── Portal: LPOs ──────────────────────────────────────────────────────────────

@router.get("/lpos")
async def list_lpos(request: Request, db: Session = Depends(get_db), current_user=Depends(get_current_user_optional)):
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    app = _get_approved_b2b_app_for_user(db, current_user)
    lpo_query = db.query(LPOModel)
    if app:
        lpo_query = lpo_query.filter(LPOModel.company_id == app.id)
    else:
        lpo_query = lpo_query.filter(LPOModel.created_by == current_user.email)
    lpos = lpo_query.order_by(LPOModel.created_at.desc()).all()
    return [
        {
            "id": l.id,
            "reference": l.reference_number,
            "company": l.company,
            "description": l.description or "",
            "amount": float(l.amount),
            "taxAmount": float(l.tax_amount),
            "currency": l.currency,
            "status": l.status.value,
            "itemCount": l.item_count,
            "dueDate": (
                l.due_date.isoformat()
                if hasattr(l.due_date, "isoformat")
                else str(l.due_date)
                if l.due_date is not None
                else None
            ),
            "createdAt": l.created_at.isoformat(),
            "updatedAt": l.updated_at.isoformat(),
        }
        for l in lpos
    ]

@router.post("/lpos")
async def create_lpo(request: Request, body: dict = Body(...), db: Session = Depends(get_db), current_user=Depends(get_current_user_optional)):
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    app = _get_approved_b2b_app_for_user(db, current_user)
    lpo_id = str(uuid4())
    ref = _gen_ref()
    amount = float(body.get("amount", 0) or 0)
    tax = float(body.get("taxAmount", 0) or 0)
    items = body.get("items", [])
    due_date_value = body.get("dueDate")
    due_date = None
    if isinstance(due_date_value, str) and due_date_value:
        try:
            due_date = datetime.fromisoformat(due_date_value)
        except ValueError:
            due_date = None

    # Recalculate tax to ensure consistency (16% VAT)
    calculated_tax = round(amount * 0.16 * 100) / 100
    total_with_tax = amount + calculated_tax
    
    lpo = LPOModel(
        id=lpo_id,
        reference_number=ref,
        company=body.get("company", ""),
        kra_pin=body.get("kraPin", ""),
        billing_address=body.get("billingAddress", ""),
        due_date=due_date,
        description=body.get("description", ""),
        status=LPOStatus.draft,
        currency="KES",
        amount=amount,
        total_amount=total_with_tax,
        tax_amount=calculated_tax,
        shipping_cost=float(body.get("shippingCost", 0) or 0),
        item_count=len(items),
        company_id=app.id if app else None,
        created_by=current_user.email,
    )
    db.add(lpo)

    # Add items with validation
    for item_data in items:
        product_id = item_data.get("productId")
        product_name = item_data.get("productName", "").strip()
        is_manual = item_data.get("isManualEntry", False)
        
        # Validate based on entry mode
        if is_manual:
            if not product_name:
                raise HTTPException(400, "Manual product entry requires a product name")
        else:
            if not product_id or product_id == 0:
                raise HTTPException(400, "Each item must have a valid product selected or use manual entry")
            # Verify product exists
            product = db.get(Product, product_id)
            if not product:
                raise HTTPException(400, f"Product {product_id} not found")
        
        quantity = int(item_data.get("quantity", 1) or 1)
        unit_price = float(item_data.get("unitPrice", 0) or 0)
        
        if quantity < 1:
            raise HTTPException(400, "Quantity must be at least 1")
        if unit_price <= 0:
            raise HTTPException(400, "Unit price must be greater than 0")
        
        item = LPOItem(
            lpo_id=lpo_id,
            product_id=product_id if not is_manual else None,
            product_name=product_name if is_manual else None,
            product_category=item_data.get("productCategory", "").strip() if is_manual else None,
            quantity=quantity,
            unit_price=unit_price,
            total_price=quantity * unit_price,
            moq=item_data.get("moq"),
            notes=item_data.get("notes"),
        )
        db.add(item)

    db.commit()
    return {
        "id": lpo_id,
        "reference": ref,
        "company": lpo.company,
        "description": lpo.description,
        "amount": amount,
        "taxAmount": tax,
        "currency": "KES",
        "status": "draft",
        "itemCount": len(items),
        "dueDate": (
            lpo.due_date.isoformat()
            if hasattr(lpo.due_date, "isoformat")
            else str(lpo.due_date)
            if lpo.due_date is not None
            else None
        ),
        "createdAt": lpo.created_at.isoformat() if lpo.created_at else datetime.utcnow().isoformat(),
        "updatedAt": lpo.updated_at.isoformat() if lpo.updated_at else datetime.utcnow().isoformat(),
    }

@router.post("/lpos/{lpo_id}/approve")
async def approve_lpo(lpo_id: str, db: Session = Depends(get_db), current_user=Depends(get_current_user_optional)):
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    lpo = db.get(LPOModel, lpo_id)
    if not lpo:
        raise HTTPException(404, "LPO not found")
    
    if lpo.status != LPOStatus.submitted:
        raise HTTPException(400, "LPO must be submitted to approve")

    company_app = db.get(B2BApplication, lpo.company_id) if lpo.company_id else None
    credit_account = None
    if company_app:
        credit_account = db.query(CreditAccount).filter(CreditAccount.company_id == company_app.id).first()
        if credit_account and credit_account.available_credit < lpo.total_amount:
            raise HTTPException(400, "Insufficient credit available to approve this LPO")

    with db.begin():
        lpo.status = LPOStatus.approved
        lpo.approved_by = current_user.email
        lpo.approved_at = datetime.utcnow()
        db.add(LPOAuditLog(lpo_id=lpo_id, action="approved", user_id=current_user.email))

        if credit_account:
            credit_account.available_credit = credit_account.available_credit - lpo.total_amount
            db.add(credit_account)

        invoice_id = str(uuid4())
        ref = _gen_ref()
        invoice = Invoice(
            id=invoice_id,
            reference_number=ref,
            lpo_id=lpo_id,
            company_id=lpo.company_id,
            status=InvoiceStatus.sent,
            total_amount=lpo.total_amount,
            tax_amount=lpo.tax_amount,
            shipping_cost=lpo.shipping_cost,
            currency=lpo.currency,
            payment_method=(PaymentMethod.credit if (company_app and company_app.payment_terms == PaymentTerms.net_30.value) else PaymentMethod.bank_transfer),
            due_date=datetime.utcnow() + timedelta(days=30),  # Net 30 by default
            created_by=current_user.email,
        )
        db.add(invoice)

        for item in lpo.items:
            invoice_item = InvoiceItem(
                invoice_id=invoice_id,
                product_id=item.product_id,
                quantity=item.quantity,
                unit_price=item.unit_price,
                total_price=item.total_price,
            )
            db.add(invoice_item)

    return {"invoiceId": invoice_id, "reference": ref}

@router.post("/lpos/{lpo_id}/soft-lock")
async def soft_lock_lpo(lpo_id: str, db: Session = Depends(get_db), current_user=Depends(get_current_user_optional)):
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    lpo = db.get(LPOModel, lpo_id)
    if not lpo:
        raise HTTPException(404, "LPO not found")
    
    if lpo.status != LPOStatus.draft:
        raise HTTPException(400, "LPO must be draft to soft-lock")

    with db.begin():
        for item in lpo.items:
            product = db.get(Product, item.product_id)
            if not product:
                raise HTTPException(400, f"Product {item.product_id} not found")
            if product.stock_quantity < item.quantity:
                raise HTTPException(400, f"Insufficient available stock for {product.name}")
            product.stock_quantity -= item.quantity
            db.add(product)

        lpo.status = LPOStatus.submitted
        db.add(LPOAuditLog(lpo_id=lpo_id, action="submitted", user_id=current_user.email))

    return {"ok": True}

@router.get("/lpos/{lpo_id}/pdf")
async def get_lpo_pdf(lpo_id: str, db: Session = Depends(get_db), current_user=Depends(get_current_user_optional)):
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    lpo = db.get(LPOModel, lpo_id)
    if not lpo:
        raise HTTPException(404, "LPO not found")

    app = _get_approved_b2b_app_for_user(db, current_user)
    if app and lpo.company_id != app.id:
        raise HTTPException(403, "Access denied")
    if not app and lpo.created_by != current_user.email:
        raise HTTPException(403, "Access denied")

    line_items = [
        f"{item.quantity} x {item.product.name if item.product else item.product_id} @ {lpo.currency} {float(item.unit_price):.2f} = {float(item.total_price):.2f}"
        for item in lpo.items
    ]
    if lpo.items:
        line_items.insert(0, "Line items:")
    else:
        line_items.insert(0, "No line items")
    if lpo.description:
        line_items.append(f"Notes: {lpo.description}")
    pdf_bytes = _make_simple_pdf(
        f"LPO {lpo.reference_number}",
        [
            f"Company: {lpo.company or 'N/A'}",
            f"Billing address: {lpo.billing_address or 'N/A'}",
            f"Due date: {_format_date(lpo.due_date)}",
            f"Subtotal: {lpo.currency} {float(lpo.amount):.2f}",
            f"Tax: {lpo.currency} {float(lpo.tax_amount):.2f}",
            f"Total: {lpo.currency} {float(lpo.total_amount):.2f}",
            f"Status: {lpo.status.value}",
            "",
            *line_items,
        ],
    )
    return Response(content=pdf_bytes, media_type="application/pdf", headers={"Content-Disposition": f"attachment; filename=\"LPO-{lpo.reference_number}.pdf\""})

@router.get("/lpos/{lpo_id}")
async def get_lpo(lpo_id: str, db: Session = Depends(get_db), current_user=Depends(get_current_user_optional)):
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    lpo = db.get(LPOModel, lpo_id)
    if not lpo:
        raise HTTPException(404, "LPO not found")
    
    # Check ownership
    app = _get_approved_b2b_app_for_user(db, current_user)
    if app and lpo.company_id != app.id:
        raise HTTPException(403, "Access denied")
    if not app and lpo.created_by != current_user.email:
        raise HTTPException(403, "Access denied")
    
    # Get audit logs
    audit_logs = db.query(LPOAuditLog).filter(LPOAuditLog.lpo_id == lpo_id).order_by(LPOAuditLog.timestamp.desc()).all()
    
    return {
        "id": lpo.id,
        "reference": lpo.reference_number,
        "company": lpo.company,
        "description": lpo.description or "",
        "amount": float(lpo.amount),
        "taxAmount": float(lpo.tax_amount),
        "currency": lpo.currency,
        "status": lpo.status.value,
        "itemCount": lpo.item_count,
        "dueDate": (
            lpo.due_date.isoformat()
            if hasattr(lpo.due_date, "isoformat")
            else str(lpo.due_date)
            if lpo.due_date is not None
            else None
        ),
        "createdAt": lpo.created_at.isoformat(),
        "updatedAt": lpo.updated_at.isoformat(),
        "items": [
            {
                "id": item.id,
                "productId": item.product_id,
                "productName": item.product_name or (item.product.name if item.product else None),
                "productCategory": item.product_category,
                "quantity": item.quantity,
                "unitPrice": float(item.unit_price),
                "totalPrice": float(item.total_price),
                "notes": item.notes,
            }
            for item in lpo.items
        ],
        "auditLogs": [
            {
                "id": log.id,
                "action": log.action,
                "userId": log.user_id,
                "timestamp": log.timestamp.isoformat(),
                "notes": log.notes,
            }
            for log in audit_logs
        ],
    }

# ── Portal: Invoices ──────────────────────────────────────────────────────────

@router.get("/invoices")
async def list_invoices(request: Request, db: Session = Depends(get_db), current_user=Depends(get_current_user_optional)):
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    app = _get_approved_b2b_app_for_user(db, current_user)
    invoice_query = db.query(Invoice)
    if app:
        invoice_query = invoice_query.filter(Invoice.company_id == app.id)
    else:
        invoice_query = invoice_query.filter(Invoice.created_by == current_user.email)
    
    invoices = invoice_query.order_by(Invoice.created_at.desc()).all()
    return [
        {
            "id": i.id,
            "reference": i.reference_number,
            "lpoId": i.lpo_id,
            "lpoReference": i.lpo.reference_number if i.lpo else i.lpo_id,
            "status": i.status.value,
            "amount": float(i.total_amount),
            "taxAmount": float(i.tax_amount),
            "currency": i.currency,
            "dueDate": (
                i.due_date.isoformat()
                if hasattr(i.due_date, "isoformat")
                else str(i.due_date)
                if i.due_date is not None
                else None
            ),
            "paidAt": (
                i.paid_at.isoformat()
                if hasattr(i.paid_at, "isoformat")
                else str(i.paid_at)
                if i.paid_at is not None
                else None
            ),
            "createdAt": i.created_at.isoformat(),
        }
        for i in invoices
    ]

@router.get("/invoices/{invoice_id}/pdf")
async def get_invoice_pdf(invoice_id: str, db: Session = Depends(get_db), current_user=Depends(get_current_user_optional)):
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    invoice = db.get(Invoice, invoice_id)
    if not invoice:
        raise HTTPException(404, "Invoice not found")
    
    # Check ownership
    app = _get_approved_b2b_app_for_user(db, current_user)
    if app and invoice.company_id != app.id:
        raise HTTPException(403, "Access denied")
    if not app and invoice.created_by != current_user.email:
        raise HTTPException(403, "Access denied")

    line_items = [
        f"{item.quantity} x {item.product.name if item.product else item.product_id} @ {invoice.currency} {float(item.unit_price):.2f} = {float(item.total_price):.2f}"
        for item in invoice.items
    ]
    if invoice.notes:
        line_items.append(f"Invoice notes: {invoice.notes}")
    pdf_bytes = _make_simple_pdf(
        f"Invoice {invoice.reference_number}",
        [
            f"LPO: {invoice.lpo.reference_number if invoice.lpo else 'N/A'}",
            f"Company: {invoice.company.company_name if invoice.company else 'N/A'}",
            f"Amount: {invoice.currency} {float(invoice.total_amount - invoice.tax_amount):.2f}",
            f"VAT: {invoice.currency} {float(invoice.tax_amount):.2f}",
            f"Total: {invoice.currency} {float(invoice.total_amount):.2f}",
            f"Due Date: {invoice.due_date.isoformat() if invoice.due_date else 'N/A'}",
            "",
            "Items:",
            *line_items,
        ],
    )
    return Response(content=pdf_bytes, media_type="application/pdf", headers={"Content-Disposition": f"attachment; filename=\"Invoice-{invoice.reference_number}.pdf\""})

@router.get("/invoices/{invoice_id}")
async def get_invoice(invoice_id: str, db: Session = Depends(get_db), current_user=Depends(get_current_user_optional)):
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    invoice = db.get(Invoice, invoice_id)
    if not invoice:
        raise HTTPException(404, "Invoice not found")
    
    # Check ownership
    app = _get_approved_b2b_app_for_user(db, current_user)
    if app and invoice.company_id != app.id:
        raise HTTPException(403, "Access denied")
    if not app and invoice.created_by != current_user.email:
        raise HTTPException(403, "Access denied")
    
    # Get LPO reference
    lpo = db.get(LPOModel, invoice.lpo_id) if invoice.lpo_id else None
    lpo_reference = lpo.reference_number if lpo else None
    
    return {
        "id": invoice.id,
        "reference": invoice.reference_number,
        "lpoReference": lpo_reference,
        "company": lpo.company if lpo else "Unknown",
        "amount": float(invoice.total_amount - invoice.tax_amount),
        "taxAmount": float(invoice.tax_amount),
        "currency": invoice.currency,
        "status": invoice.status.value,
        "dueDate": invoice.due_date.isoformat() if invoice.due_date else None,
        "createdAt": invoice.created_at.isoformat(),
        "paymentMethod": invoice.payment_method,
        "paymentReference": invoice.payment_reference,
    }

# ── Portal: Catalog ───────────────────────────────────────────────────────────

@router.get("/catalog")
async def b2b_catalog(request: Request, db: Session = Depends(get_db), current_user=Depends(get_current_user_optional)):
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Get products with B2B pricing (for now, just all products)
    products = db.query(Product).filter(Product.is_active == True).all()
    return [
        {
            "id": p.id,
            "name": p.name,
            "description": p.description,
            "category": p.category or "General",
            "wholesalePrice": float(p.price * 0.9),  # 10% discount for B2B
            "retailPrice": float(p.price),
            "currency": "KES",
            "stock": 100,  # Placeholder stock
            "minOrderQty": 10,
            "unit": "pcs",
        }
        for p in products
    ]

class SupplierPayload(BaseModel):
    name: str
    category: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    address: Optional[str] = None

# ── Portal: suppliers ─────────────────────────────────────────────────────────

@router.get("/suppliers")
async def list_suppliers(request: Request, db: Session = Depends(get_db), current_user=Depends(get_current_user_optional)):
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    app = _get_approved_b2b_app_for_user(db, current_user)
    if not app:
        # Return empty list for non-approved users instead of 403
        return []

    supplier_stats = db.query(
        func.lower(LPOModel.company).label("company_name"),
        func.count(LPOModel.id).label("lpo_count"),
        func.coalesce(func.sum(LPOModel.total_amount), 0).label("total_spend"),
    ).filter(
        LPOModel.company_id == app.id,
        LPOModel.company != None,
    ).group_by(func.lower(LPOModel.company)).all()

    stats_by_name = {
        row.company_name: row
        for row in supplier_stats
    }

    suppliers = db.query(Supplier).filter(Supplier.company_id == app.id).order_by(Supplier.name).all()
    return [
        {
            "id": s.id,
            "name": s.name,
            "category": s.category,
            "email": s.email,
            "phone": s.phone,
            "address": s.address,
            "status": "active",
            "lpoCount": int((stats_by_name.get((s.name or "").lower()).lpo_count if stats_by_name.get((s.name or "").lower()) else 0)),
            "totalSpend": float((stats_by_name.get((s.name or "").lower()).total_spend if stats_by_name.get((s.name or "").lower()) else 0)),
            "createdAt": s.created_at.isoformat() if s.created_at else None,
        }
        for s in suppliers
    ]

@router.get("/suppliers/{supplier_id}")
async def get_supplier(supplier_id: str, db: Session = Depends(get_db), current_user=Depends(get_current_user_optional)):
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    app = _get_approved_b2b_app_for_user(db, current_user)
    if not app:
        raise HTTPException(status_code=403, detail="B2B company not approved")

    supplier = db.get(Supplier, supplier_id)
    if not supplier or supplier.company_id != app.id:
        raise HTTPException(status_code=404, detail="Supplier not found")

    related_lpos = db.query(LPOModel).filter(
        LPOModel.company_id == app.id,
        func.lower(LPOModel.company) == (supplier.name or "").lower(),
    ).order_by(LPOModel.created_at.desc()).all()

    return {
        "id": supplier.id,
        "name": supplier.name,
        "category": supplier.category,
        "email": supplier.email,
        "phone": supplier.phone,
        "address": supplier.address,
        "status": "active",
        "createdAt": supplier.created_at.isoformat() if supplier.created_at else None,
        "lpoCount": len(related_lpos),
        "totalSpend": float(sum((l.total_amount or 0) for l in related_lpos)),
        "relatedLPOs": [
            {
                "id": l.id,
                "reference": l.reference_number,
                "description": l.description or "",
                "status": l.status.value,
                "amount": float(l.amount),
                "taxAmount": float(l.tax_amount),
                "currency": l.currency,
                "createdAt": l.created_at.isoformat(),
            }
            for l in related_lpos
        ],
    }

@router.post("/suppliers")
async def create_supplier(
    payload: SupplierPayload,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user_optional),
):
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    app = _get_approved_b2b_app_for_user(db, current_user)
    if not app:
        raise HTTPException(status_code=403, detail="B2B company not approved")

    supplier = Supplier(
        id=str(uuid4()),
        company_id=app.id,
        name=payload.name,
        category=payload.category,
        email=payload.email,
        phone=payload.phone,
        address=payload.address,
        created_by=current_user.email,
    )
    db.add(supplier)
    db.commit()
    return {
        "id": supplier.id,
        "name": supplier.name,
        "category": supplier.category,
        "email": supplier.email,
        "phone": supplier.phone,
        "address": supplier.address,
        "createdAt": supplier.created_at.isoformat() if supplier.created_at else None,
    }

# ── Helpers ───────────────────────────────────────────────────────────────────

def _serialize_app(app: "B2BApplication", docs: list) -> dict:
    return {
        "id": app.id,
        "referenceNumber": app.reference_number,
        "status": app.status,
        "submittedAt": app.submitted_at.isoformat(),
        "updatedAt": app.updated_at.isoformat(),
        "reviewNotes": app.review_notes,
        "creditLimit": app.credit_limit,
        "paymentTerms": app.payment_terms,
        "reviewedBy": app.reviewed_by,
        "company": {
            "name": app.company_name,
            "kraPin": app.kra_pin,
            "registrationNumber": app.registration_number,
            "vatNumber": app.vat_number,
            "industry": app.industry,
            "website": app.website,
            "physicalAddress": app.physical_address,
            "city": app.city,
            "country": app.country,
        },
        "primaryContact": {
            "fullName": app.primary_contact_name,
            "title": app.primary_contact_title,
            "email": app.primary_contact_email,
            "phone": app.primary_contact_phone,
            "department": app.primary_contact_dept,
        },
        "financeContact": {
            "fullName": app.finance_contact_name,
            "email": app.finance_contact_email,
            "phone": app.finance_contact_phone,
        },
        "documents": [
            {
                "key": d.doc_key,
                "label": d.label,
                "url": d.url,
                "uploadedAt": d.uploaded_at.isoformat(),
                "verified": d.verified,
                "verifiedBy": d.verified_by,
            }
            for d in docs
        ],
    }

def _status_email_subject(status: str, ref: str) -> str:
    return {
        "approved":         f"Your B2B account has been approved — {ref}",
        "rejected":         f"B2B Application update — {ref}",
        "more_info_needed": f"Action required: additional info needed — {ref}",
    }.get(status, f"B2B Application update — {ref}")

async def _activate_company_account(app_id: str, email: str):
    """
    Create login credentials for the approved company.
    This runs after admin approval and links the B2B application to a User.
    """
    db = SessionLocal()
    try:
        app = db.get(B2BApplication, app_id)
        if not app or app.status != "approved":
            return

        user = db.query(User).filter(User.email == email).first()
        if not user:
            password = str(uuid4())
            user = User(
                email=email,
                name=app.primary_contact_name,
                password=get_password_hash(password),
                role="b2b_company",
                openId=str(uuid4()),
                loginMethod="email",
                emailVerified=True,
                updatedAt=datetime.utcnow(),
                lastSignedIn=datetime.utcnow(),
            )
            db.add(user)
            db.flush()
            # TODO: send password reset / invite link instead of plaintext password
            await send_email(
                to=email,
                subject="Your B2B account is approved",
                template="b2b_account_created",
                context={"name": app.primary_contact_name, "password": password},
            )
        else:
            if user.role != "b2b_company":
                user.role = "b2b_company"
            if not user.emailVerified:
                user.emailVerified = True
            user.updatedAt = datetime.utcnow()

        if not app.user_id:
            app.user_id = user.id
            db.add(app)

        db.commit()
    finally:
        db.close()
def _escape_pdf_text(text: str) -> str:
    return text.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")

def _make_simple_pdf(title: str, lines: list[str]) -> bytes:
    title_text = _escape_pdf_text(title)
    stream = (
        "BT\n"
        "/F1 18 Tf\n"
        "72 750 Td\n"
        f"({title_text}) Tj\n"
        "/F1 11 Tf\n"
        "-18 TL\n"
        "0 -24 Td\n"
    ).encode("latin1")
    for line in lines:
        line_text = _escape_pdf_text(line)
        stream += f"({line_text}) Tj\nT*\n".encode("latin1")
    stream += b"ET\n"

    objects = []
    objects.append(b"1 0 obj<< /Type /Catalog /Pages 2 0 R >>\nendobj\n")
    objects.append(b"2 0 obj<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n")
    objects.append(b"3 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>\nendobj\n")
    objects.append(b"4 0 obj<< /Length %d >>\nstream\n" % len(stream) + stream + b"endstream\nendobj\n")
    objects.append(b"5 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n")

    pdf = b"%PDF-1.4\n" + b"".join(objects)
    offsets = []
    current = len(b"%PDF-1.4\n")
    for obj in objects:
        offsets.append(current)
        current += len(obj)

    xref = b"xref\n0 %d\n0000000000 65535 f \n" % (len(objects) + 1)
    for offset in offsets:
        xref += b"%010d 00000 n \n" % offset

    trailer = (
        b"trailer << /Size %d /Root 1 0 R >>\nstartxref\n" % (len(objects) + 1)
        + str(len(pdf)).encode("latin1")
        + b"\n%%EOF\n"
    )
    return pdf + xref + trailer
# ── Router aliases for clean mounting ────────────────────────────────────────
# public_router: /register /summary /lpos /suppliers
# admin_router:  /applications /applications/{id}/status /applications/{id}/documents/{key}/verify
from fastapi import APIRouter as _APIRouter

public_router = _APIRouter()
admin_router  = _APIRouter()

# re-export so main.py can import both
