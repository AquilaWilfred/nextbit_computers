-- ── Daraja Escrow Records ─────────────────────────────────────────────────────
-- Separate from the existing escrow_transactions table.
-- References escrow_transactions.id — keeps Daraja-specific data isolated
-- from the existing Flutterwave columns.

CREATE TABLE daraja_escrow_records (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    escrow_id               UUID NOT NULL UNIQUE
                                REFERENCES escrow_transactions(id) ON DELETE CASCADE,

    -- C2B / STK Push
    mpesa_checkout_id       VARCHAR(100),   -- CheckoutRequestID from STK push
    mpesa_merchant_id       VARCHAR(100),   -- MerchantRequestID
    mpesa_receipt           VARCHAR(50),    -- e.g. OFI2XXXXXXX
    buyer_phone             VARCHAR(15),    -- 2547XXXXXXXX

    -- B2C payout or refund
    b2c_conversation_id     VARCHAR(100),
    b2c_originator_id       VARCHAR(150),   -- escrow_id or "refund-{escrow_id}"
    b2c_receipt             VARCHAR(50),
    b2c_recipient_phone     VARCHAR(15),

    -- Tax remittance
    tax_conversation_id     VARCHAR(100),
    tax_receipt             VARCHAR(50),
    tax_amount_cents        BIGINT,
    tax_remitted_at         TIMESTAMPTZ,

    -- Amounts (all in KES cents = KES * 100)
    gross_amount_cents      BIGINT NOT NULL DEFAULT 0,
    fee_cents               BIGINT NOT NULL DEFAULT 0,
    tax_cents               BIGINT NOT NULL DEFAULT 0,
    net_amount_cents        BIGINT NOT NULL DEFAULT 0,

    -- Lifecycle timestamps
    stk_push_initiated_at   TIMESTAMPTZ,
    payment_confirmed_at    TIMESTAMPTZ,
    payout_initiated_at     TIMESTAMPTZ,
    payout_completed_at     TIMESTAMPTZ,
    refund_initiated_at     TIMESTAMPTZ,
    refund_completed_at     TIMESTAMPTZ,

    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_daraja_escrow_id           ON daraja_escrow_records(escrow_id);
CREATE INDEX idx_daraja_checkout_id         ON daraja_escrow_records(mpesa_checkout_id);
CREATE INDEX idx_daraja_receipt             ON daraja_escrow_records(mpesa_receipt);
CREATE INDEX idx_daraja_b2c_originator      ON daraja_escrow_records(b2c_originator_id);
CREATE INDEX idx_daraja_tax_conversation    ON daraja_escrow_records(tax_conversation_id);

CREATE TRIGGER daraja_escrow_updated_at
    BEFORE UPDATE ON daraja_escrow_records
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();