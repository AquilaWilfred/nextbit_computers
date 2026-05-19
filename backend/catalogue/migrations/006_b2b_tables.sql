-- Create B2B tables migration
-- Migration: 006_b2b_tables.sql

-- B2B Applications table
CREATE TABLE IF NOT EXISTS b2b_applications (
    id                   VARCHAR PRIMARY KEY,
    reference_number     VARCHAR UNIQUE NOT NULL,
    status               VARCHAR NOT NULL DEFAULT 'pending',
    user_id              INTEGER REFERENCES users(id),
    company_name         VARCHAR NOT NULL,
    kra_pin              VARCHAR NOT NULL,
    registration_number  VARCHAR NOT NULL,
    vat_number           VARCHAR,
    industry             VARCHAR NOT NULL,
    website              VARCHAR,
    physical_address     TEXT NOT NULL,
    postal_address       VARCHAR,
    city                 VARCHAR NOT NULL,
    country              VARCHAR NOT NULL DEFAULT 'Kenya',
    primary_contact_name  VARCHAR NOT NULL,
    primary_contact_title VARCHAR,
    primary_contact_email VARCHAR NOT NULL,
    primary_contact_phone VARCHAR NOT NULL,
    primary_contact_dept  VARCHAR,
    finance_contact_name  VARCHAR NOT NULL,
    finance_contact_email VARCHAR NOT NULL,
    finance_contact_phone VARCHAR NOT NULL,
    review_notes         TEXT,
    credit_limit         INTEGER,
    payment_terms        VARCHAR,
    reviewed_by          VARCHAR,
    submitted_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- B2B Documents table
CREATE TABLE IF NOT EXISTS b2b_documents (
    id             VARCHAR PRIMARY KEY,
    application_id VARCHAR REFERENCES b2b_applications(id) ON DELETE CASCADE,
    doc_key        VARCHAR NOT NULL,
    label          VARCHAR NOT NULL,
    url            TEXT NOT NULL,
    verified       BOOLEAN NOT NULL DEFAULT FALSE,
    verified_by    VARCHAR,
    verified_at    TIMESTAMPTZ,
    uploaded_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS ix_b2b_applications_kra_pin ON b2b_applications(kra_pin);
CREATE INDEX IF NOT EXISTS ix_b2b_applications_reference ON b2b_applications(reference_number);
CREATE INDEX IF NOT EXISTS ix_b2b_applications_user_id ON b2b_applications(user_id);
CREATE INDEX IF NOT EXISTS ix_b2b_documents_application_id ON b2b_documents(application_id);