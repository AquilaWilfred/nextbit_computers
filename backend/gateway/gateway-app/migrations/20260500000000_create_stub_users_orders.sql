-- Create minimal stub tables required by escrow migration (for local testing only)
-- This migration is intentionally lightweight and only creates the referenced
-- tables if they do not already exist, so the escrow migration's foreign keys
-- can be implemented during dev/testing.

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid()
);

CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    buyer_id UUID REFERENCES users(id) ON DELETE RESTRICT,
    seller_id UUID REFERENCES users(id) ON DELETE RESTRICT
);
