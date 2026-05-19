CREATE TABLE IF NOT EXISTS b2b_suppliers (
    id VARCHAR PRIMARY KEY,
    company_id VARCHAR REFERENCES b2b_applications(id) ON DELETE SET NULL,
    name VARCHAR NOT NULL,
    category VARCHAR NULL,
    email VARCHAR NULL,
    phone VARCHAR NULL,
    address TEXT NULL,
    created_by VARCHAR NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_b2b_suppliers_company_id ON b2b_suppliers(company_id);
CREATE INDEX IF NOT EXISTS ix_b2b_suppliers_created_by ON b2b_suppliers(created_by);
