-- ── NextBit Wallet & Virtual Card Schema ──────────────────────────────────────

-- wallet card per user (one card per user at MVP)
CREATE TABLE nextbit_cards (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL,

    -- card display (internal only, never leaves NextBit)
    card_number     VARCHAR(16) NOT NULL UNIQUE,  -- generated, e.g. NB43 **** **** 1234
    card_holder     VARCHAR(100) NOT NULL,
    expiry_month    SMALLINT NOT NULL,
    expiry_year     SMALLINT NOT NULL,

    -- balance in KES (stored as integer kobo/cents to avoid float errors)
    balance_cents   BIGINT NOT NULL DEFAULT 0 CHECK (balance_cents >= 0),

    -- flutterwave VAN (created lazily on first load)
    fw_van          VARCHAR(20),                  -- virtual account number
    fw_van_bank     VARCHAR(100),                 -- bank name from FW
    fw_van_ref      VARCHAR(100),                 -- FW reference

    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_card_user_id ON nextbit_cards(user_id);
CREATE INDEX idx_card_number ON nextbit_cards(card_number);

-- all money movements on a card
CREATE TYPE wallet_tx_type AS ENUM (
    'load_mpesa',
    'load_card',
    'load_bank',
    'order_payment',        -- wallet used to pay order
    'order_refund',         -- refund back to wallet
    'seller_payout',        -- seller receives from escrow
    'withdrawal',           -- seller withdraws to bank/mpesa
    'platform_fee',         -- nextbit platform fee deducted
    'fw_fee_share'          -- flutterwave fee share (50/50)
);

CREATE TYPE wallet_tx_status AS ENUM (
    'pending',
    'completed',
    'failed',
    'reversed'
);

CREATE TABLE wallet_transactions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    card_id         UUID NOT NULL REFERENCES nextbit_cards(id) ON DELETE RESTRICT,
    user_id         UUID NOT NULL,

    tx_type         wallet_tx_type   NOT NULL,
    status          wallet_tx_status NOT NULL DEFAULT 'pending',

    -- amounts in cents
    amount_cents    BIGINT NOT NULL CHECK (amount_cents > 0),
    fee_cents       BIGINT NOT NULL DEFAULT 0,
    net_cents       BIGINT NOT NULL,              -- amount after fee

    -- balance snapshot after this tx
    balance_before  BIGINT NOT NULL,
    balance_after   BIGINT NOT NULL,

    -- references
    escrow_id       UUID REFERENCES escrow_transactions(id),
    fw_tx_ref       VARCHAR(255),
    fw_charge_id    VARCHAR(255),
    description     TEXT,

    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_wtx_card_id   ON wallet_transactions(card_id);
CREATE INDEX idx_wtx_user_id   ON wallet_transactions(user_id);
CREATE INDEX idx_wtx_escrow_id ON wallet_transactions(escrow_id);
CREATE INDEX idx_wtx_status    ON wallet_transactions(status);

-- platform fee config (so you can update without redeploying)
CREATE TABLE platform_fee_tiers (
    id              SERIAL PRIMARY KEY,
    min_amount_cents BIGINT NOT NULL,
    max_amount_cents BIGINT,               -- NULL = no upper limit
    fee_bps         SMALLINT NOT NULL,     -- basis points: 100 = 1%, 300 = 3%
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- seed the tiers
INSERT INTO platform_fee_tiers (min_amount_cents, max_amount_cents, fee_bps) VALUES
    (0,        499999,   0),      -- KES 0–4,999       → 0%
    (500000,   1999999,  300),    -- KES 5,000–19,999  → 3%
    (2000000,  4999999,  200),    -- KES 20,000–49,999 → 2%
    (5000000,  9999999,  150),    -- KES 50,000–99,999 → 1.5%
    (10000000, NULL,     100);    -- KES 100,000+      → 1%

-- triggers
CREATE TRIGGER wallet_cards_updated_at
    BEFORE UPDATE ON nextbit_cards
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER wallet_tx_updated_at
    BEFORE UPDATE ON wallet_transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();