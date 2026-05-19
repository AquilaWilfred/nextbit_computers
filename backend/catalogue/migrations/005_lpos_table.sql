CREATE TABLE IF NOT EXISTS lpos (
    id               VARCHAR PRIMARY KEY,
    reference_number VARCHAR UNIQUE NOT NULL,
    company_id       INTEGER REFERENCES users(id) ON DELETE SET NULL,
    company          VARCHAR NOT NULL,
    kra_pin          VARCHAR NOT NULL,
    billing_address  TEXT NOT NULL,
    due_date         VARCHAR,
    description      TEXT,
    status           VARCHAR NOT NULL DEFAULT 'draft',
    amount           INTEGER NOT NULL DEFAULT 0,
    tax_amount       INTEGER NOT NULL DEFAULT 0,
    currency         VARCHAR NOT NULL DEFAULT 'KES',
    item_count       INTEGER NOT NULL DEFAULT 0,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_lpos_company_id ON lpos(company_id);
CREATE INDEX IF NOT EXISTS ix_lpos_reference ON lpos(reference_number);
