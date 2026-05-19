# app/models/b2b.py

from sqlalchemy import (
    ForeignKey, Column, String, Boolean, Integer, DateTime, ForeignKey, Text, func
)
from sqlalchemy.orm import relationship
from db.postgres import Base  # your existing declarative base


class B2BApplication(Base):
    __tablename__ = "b2b_applications"

    id                   = Column(String, primary_key=True)
    reference_number     = Column(String, unique=True, nullable=False, index=True)
    status               = Column(String, nullable=False, default="pending")
    # "pending" | "under_review" | "approved" | "rejected" | "more_info_needed"

    # Linked user account (set on registration)
    user_id              = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)

    # Company info
    company_name         = Column(String, nullable=False)
    kra_pin              = Column(String, nullable=False, index=True)
    registration_number  = Column(String, nullable=False)
    vat_number           = Column(String, nullable=True)
    industry             = Column(String, nullable=False)
    website              = Column(String, nullable=True)
    physical_address     = Column(Text, nullable=False)
    postal_address       = Column(String, nullable=True)
    city                 = Column(String, nullable=False)
    country              = Column(String, nullable=False, default="Kenya")

    # Primary contact
    primary_contact_name  = Column(String, nullable=False)
    primary_contact_title = Column(String, nullable=True)
    primary_contact_email = Column(String, nullable=False)
    primary_contact_phone = Column(String, nullable=False)
    primary_contact_dept  = Column(String, nullable=True)

    # Finance contact
    finance_contact_name  = Column(String, nullable=False)
    finance_contact_email = Column(String, nullable=False)
    finance_contact_phone = Column(String, nullable=False)

    # Review fields (filled by admin)
    review_notes         = Column(Text, nullable=True)
    credit_limit         = Column(Integer, nullable=True)   # KES
    payment_terms        = Column(String, nullable=True)    # net_14 | net_30 | net_60 | net_90
    reviewed_by          = Column(String, nullable=True)    # admin user id

    # Timestamps
    submitted_at         = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at           = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationship
    documents            = relationship("B2BDocument", back_populates="application", cascade="all, delete-orphan")
    lpos                 = relationship("models.lpo.LPO", back_populates="company_app", cascade="all, delete-orphan")
    invoices             = relationship("models.invoice.Invoice", back_populates="company", cascade="all, delete-orphan")
    suppliers            = relationship("models.supplier.Supplier", back_populates="company", cascade="all, delete-orphan")
    credit_account       = relationship("models.credit.CreditAccount", back_populates="company", uselist=False)


class B2BDocument(Base):
    __tablename__ = "b2b_documents"

    id             = Column(String, primary_key=True)
    application_id = Column(String, ForeignKey("b2b_applications.id", ondelete="CASCADE"), nullable=False, index=True)
    doc_key        = Column(String, nullable=False)   # e.g. "kra_pin_cert"
    label          = Column(String, nullable=False)   # human-readable
    url            = Column(Text, nullable=False)      # R2 URL
    verified       = Column(Boolean, nullable=False, default=False)
    verified_by    = Column(String, nullable=True)     # admin user id
    verified_at    = Column(DateTime(timezone=True), nullable=True)
    uploaded_at    = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    application    = relationship("B2BApplication", back_populates="documents")


# ─────────────────────────────────────────────────────────────────────────────
# Alembic migration — paste into a new migration file in alembic/versions/
# Run: alembic revision --autogenerate -m "add_b2b_tables"
# Then: alembic upgrade head
# ─────────────────────────────────────────────────────────────────────────────

MIGRATION_SCRIPT = """
\"\"\"add b2b tables

Revision ID: add_b2b_tables
Revises: <your_previous_revision>
Create Date: 2025-01-01
\"\"\"
from alembic import op
import sqlalchemy as sa

def upgrade():
    op.create_table(
        'b2b_applications',
        sa.Column('id',                   sa.String(),  primary_key=True),
        sa.Column('reference_number',     sa.String(),  nullable=False, unique=True),
        sa.Column('status',               sa.String(),  nullable=False, server_default='pending'),
        sa.Column('company_name',         sa.String(),  nullable=False),
        sa.Column('kra_pin',              sa.String(),  nullable=False),
        sa.Column('registration_number',  sa.String(),  nullable=False),
        sa.Column('vat_number',           sa.String(),  nullable=True),
        sa.Column('industry',             sa.String(),  nullable=False),
        sa.Column('website',              sa.String(),  nullable=True),
        sa.Column('physical_address',     sa.Text(),    nullable=False),
        sa.Column('postal_address',       sa.String(),  nullable=True),
        sa.Column('city',                 sa.String(),  nullable=False),
        sa.Column('country',              sa.String(),  nullable=False, server_default='Kenya'),
        sa.Column('primary_contact_name',  sa.String(), nullable=False),
        sa.Column('primary_contact_title', sa.String(), nullable=True),
        sa.Column('primary_contact_email', sa.String(), nullable=False),
        sa.Column('primary_contact_phone', sa.String(), nullable=False),
        sa.Column('primary_contact_dept',  sa.String(), nullable=True),
        sa.Column('finance_contact_name',  sa.String(), nullable=False),
        sa.Column('finance_contact_email', sa.String(), nullable=False),
        sa.Column('finance_contact_phone', sa.String(), nullable=False),
        sa.Column('review_notes',    sa.Text(),    nullable=True),
        sa.Column('credit_limit',    sa.Integer(), nullable=True),
        sa.Column('payment_terms',   sa.String(),  nullable=True),
        sa.Column('reviewed_by',     sa.String(),  nullable=True),
        sa.Column('submitted_at',    sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at',      sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index('ix_b2b_applications_kra_pin', 'b2b_applications', ['kra_pin'])
    op.create_index('ix_b2b_applications_reference', 'b2b_applications', ['reference_number'])

    op.create_table(
        'b2b_documents',
        sa.Column('id',             sa.String(),  primary_key=True),
        sa.Column('application_id', sa.String(),  sa.ForeignKey('b2b_applications.id', ondelete='CASCADE'), nullable=False),
        sa.Column('doc_key',        sa.String(),  nullable=False),
        sa.Column('label',          sa.String(),  nullable=False),
        sa.Column('url',            sa.Text(),    nullable=False),
        sa.Column('verified',       sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('verified_by',    sa.String(),  nullable=True),
        sa.Column('verified_at',    sa.DateTime(timezone=True), nullable=True),
        sa.Column('uploaded_at',    sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index('ix_b2b_documents_application_id', 'b2b_documents', ['application_id'])

def downgrade():
    op.drop_table('b2b_documents')
    op.drop_table('b2b_applications')
"""

