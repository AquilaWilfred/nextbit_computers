CREATE TABLE IF NOT EXISTS addresses (
    id          SERIAL PRIMARY KEY,
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    full_name   TEXT NOT NULL,
    phone       TEXT NOT NULL,
    address_line TEXT NOT NULL,
    city        TEXT NOT NULL,
    postal_code TEXT,
    country     TEXT NOT NULL DEFAULT 'Kenya',
    is_default  BOOLEAN NOT NULL DEFAULT false,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_addresses_user_id ON addresses(user_id);
