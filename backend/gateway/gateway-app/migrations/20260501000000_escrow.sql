-- escrow_state enum
CREATE TYPE escrow_state AS ENUM (
    'created',
    'payment_pending',
    'funds_held_in_escrow',
    'dispute_raised',
    'waiting',
    'delivery_confirmed',
    'released_to_seller',
    'refunded',
    'payout_completed'
);

-- escrow_transactions table
CREATE TABLE escrow_transactions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id        UUID NOT NULL,
    buyer_id        UUID NOT NULL,
    seller_id       UUID NOT NULL,

    -- money
    amount          NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    currency        VARCHAR(3)     NOT NULL DEFAULT 'KES',

    -- state machine
    state           escrow_state   NOT NULL DEFAULT 'created',

    -- flutterwave
    fw_tx_ref       VARCHAR(255)   UNIQUE,          -- our reference sent to FW
    fw_transfer_id  VARCHAR(255),                   -- FW payout transfer ID
    fw_charge_id    VARCHAR(255),                   -- FW charge ID on success

    -- dispute
    dispute_reason  TEXT,
    dispute_raised_at TIMESTAMPTZ,
    admin_id        UUID,      -- who mediated (FK omitted for resilience)
    admin_ruling    VARCHAR(10) CHECK (admin_ruling IN ('buyer', 'seller')),
    admin_ruled_at  TIMESTAMPTZ,

    -- auto-release
    auto_release_at TIMESTAMPTZ,                    -- set when delivery confirmed

    -- audit
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- index for fast lookups
CREATE INDEX idx_escrow_order_id   ON escrow_transactions(order_id);
CREATE INDEX idx_escrow_buyer_id   ON escrow_transactions(buyer_id);
CREATE INDEX idx_escrow_seller_id  ON escrow_transactions(seller_id);
CREATE INDEX idx_escrow_state      ON escrow_transactions(state);
CREATE INDEX idx_escrow_fw_tx_ref  ON escrow_transactions(fw_tx_ref);

-- audit log — every state change recorded
CREATE TABLE escrow_audit_log (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    escrow_id       UUID NOT NULL REFERENCES escrow_transactions(id) ON DELETE CASCADE,
    from_state      escrow_state,
    to_state        escrow_state NOT NULL,
    action          VARCHAR(50)  NOT NULL,
    performed_by    UUID,
    metadata        JSONB,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_escrow_id ON escrow_audit_log(escrow_id);

-- auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER escrow_updated_at
    BEFORE UPDATE ON escrow_transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
