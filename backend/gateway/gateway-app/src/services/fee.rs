// ── src/services/fee.rs ────────────────────────────────────────────────────────
// ALL fee logic lives here. One place, one truth.
// Amounts are in KES cents (integer) to avoid float rounding errors.
// KES 1,000 = 100_000 cents

use sqlx::{PgPool, Row};

// ── Constants ──────────────────────────────────────────────────────────────────

/// Flutterwave M-Pesa fee: 2.9%  = 290 basis points
pub const FW_MPESA_FEE_BPS: u64 = 290;

/// Flutterwave card fee: 3.8% = 380 bps (local card; international is 480)
pub const FW_CARD_FEE_BPS: u64 = 380;

/// Flutterwave bank transfer fee: 1.4% = 140 bps
pub const FW_BANK_FEE_BPS: u64 = 140;

/// Flat seller withdrawal fee in cents (KES 50 = 5_000 cents)
pub const WITHDRAWAL_FLAT_FEE_CENTS: i64 = 5_000;

/// Minimum first-time wallet load in cents (KES 1,000)
pub const MIN_FIRST_LOAD_CENTS: i64 = 100_000;

/// Minimum top-up load in cents (KES 500)
pub const MIN_TOPUP_LOAD_CENTS: i64 = 50_000;

// ── Payment Method ─────────────────────────────────────────────────────────────

#[derive(Debug, Clone, PartialEq, serde::Deserialize, serde::Serialize)]
#[serde(rename_all = "snake_case")]
pub enum PaymentMethod {
    Mpesa,
    Card,
    BankTransfer,
    Wallet,  // internal — no Flutterwave fee
}

// ── Fee Breakdown ──────────────────────────────────────────────────────────────

#[derive(Debug, Clone, serde::Serialize)]
pub struct FeeBreakdown {
    pub gross_cents:         i64,   // what customer sends
    pub fw_fee_cents:        i64,   // flutterwave's cut
    pub platform_fee_cents:  i64,   // nextbit's cut
    pub buyer_fw_share:      i64,   // buyer pays half of FW fee
    pub seller_fw_share:     i64,   // seller absorbs half of FW fee
    pub net_to_seller:       i64,   // seller receives after all deductions
    pub net_to_wallet:       i64,   // credited to wallet (for load operations)
}

// ── Wallet Load Fee (customer bears full Flutterwave fee) ──────────────────────

pub fn calculate_load_fee(
    amount_cents: i64,
    method: &PaymentMethod,
) -> FeeBreakdown {
    let fw_bps = match method {
        PaymentMethod::Mpesa        => FW_MPESA_FEE_BPS,
        PaymentMethod::Card         => FW_CARD_FEE_BPS,
        PaymentMethod::BankTransfer => FW_BANK_FEE_BPS,
        PaymentMethod::Wallet       => 0,
    };

    let fw_fee = (amount_cents as u64 * fw_bps / 10_000) as i64;
    let net    = amount_cents - fw_fee;

    FeeBreakdown {
        gross_cents:        amount_cents,
        fw_fee_cents:       fw_fee,
        platform_fee_cents: 0,        // no platform fee on loads
        buyer_fw_share:     fw_fee,   // buyer bears full load fee
        seller_fw_share:    0,
        net_to_seller:      0,
        net_to_wallet:      net,      // credited to wallet
    }
}

// ── Order Payment Fee (FW fee split 50/50 + platform fee from seller) ──────────

pub async fn calculate_order_fee(
    pool:          &PgPool,
    amount_cents:  i64,
    method:        &PaymentMethod,
) -> Result<FeeBreakdown, sqlx::Error> {
    // 1. Flutterwave fee
    let fw_bps = match method {
        PaymentMethod::Mpesa        => FW_MPESA_FEE_BPS,
        PaymentMethod::Card         => FW_CARD_FEE_BPS,
        PaymentMethod::BankTransfer => FW_BANK_FEE_BPS,
        PaymentMethod::Wallet       => 0,  // wallet-to-wallet: no FW fee
    };

    let fw_fee        = (amount_cents as u64 * fw_bps / 10_000) as i64;
    let buyer_share   = fw_fee / 2;
    let seller_share  = fw_fee - buyer_share; // handles odd cents

    // 2. Platform fee — look up tier from DB
    let platform_fee = get_platform_fee(pool, amount_cents).await?;

    // 3. Net to seller
    let net_to_seller = amount_cents - seller_share - platform_fee;

    Ok(FeeBreakdown {
        gross_cents:        amount_cents,
        fw_fee_cents:       fw_fee,
        platform_fee_cents: platform_fee,
        buyer_fw_share:     buyer_share,
        seller_fw_share:    seller_share,
        net_to_seller,
        net_to_wallet:      0,
    })
}

// ── Platform Fee Tier Lookup ───────────────────────────────────────────────────

pub async fn get_platform_fee(
    pool:         &PgPool,
    amount_cents: i64,
) -> Result<i64, sqlx::Error> {
    let tier = sqlx::query(
        r#"
        SELECT fee_bps
        FROM platform_fee_tiers
        WHERE is_active = TRUE
          AND min_amount_cents <= $1
          AND (max_amount_cents IS NULL OR max_amount_cents > $1)
        LIMIT 1
        "#,
    )
    .bind(amount_cents)
    .fetch_optional(pool)
    .await?;

    let fee_bps = tier
        .map(|row| row.get::<i16, _>("fee_bps") as i64)
        .unwrap_or(0);
    Ok(amount_cents * fee_bps / 10_000)
}

/// Compute the platform fee using the same tiered rules as the database-backed fee config.
pub fn compute_platform_fee_cents(amount_cents: i64) -> i64 {
    let fee_bps = if amount_cents >= 10_000_000 {
        100
    } else if amount_cents >= 5_000_000 {
        150
    } else if amount_cents >= 2_000_000 {
        200
    } else if amount_cents >= 500_000 {
        300
    } else {
        0
    };
    amount_cents * fee_bps / 10_000
}

// ── Withdrawal Fee ─────────────────────────────────────────────────────────────

pub fn calculate_withdrawal_fee(amount_cents: i64) -> FeeBreakdown {
    FeeBreakdown {
        gross_cents:        amount_cents,
        fw_fee_cents:       WITHDRAWAL_FLAT_FEE_CENTS,
        platform_fee_cents: 0,
        buyer_fw_share:     0,
        seller_fw_share:    WITHDRAWAL_FLAT_FEE_CENTS,
        net_to_seller:      amount_cents - WITHDRAWAL_FLAT_FEE_CENTS,
        net_to_wallet:      0,
    }
}

// ── Helpers ────────────────────────────────────────────────────────────────────

/// Convert KES float to cents safely
pub fn kes_to_cents(kes: f64) -> i64 {
    (kes * 100.0).round() as i64
}

/// Convert cents to KES float for display
pub fn cents_to_kes(cents: i64) -> f64 {
    cents as f64 / 100.0
}

// ── Tests ──────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_load_fee_mpesa() {
        // KES 10,000 loaded via M-Pesa
        let fee = calculate_load_fee(1_000_000, &PaymentMethod::Mpesa);
        assert_eq!(fee.fw_fee_cents, 29_000);     // 2.9% of 1,000,000
        assert_eq!(fee.net_to_wallet, 971_000);   // KES 9,710
    }

    #[test]
    fn test_load_fee_wallet_is_free() {
        let fee = calculate_load_fee(1_000_000, &PaymentMethod::Wallet);
        assert_eq!(fee.fw_fee_cents, 0);
        assert_eq!(fee.net_to_wallet, 1_000_000);
    }

    #[test]
    fn test_withdrawal_fee() {
        // seller withdraws KES 50,000
        let fee = calculate_withdrawal_fee(5_000_000);
        assert_eq!(fee.fw_fee_cents, 5_000);      // KES 50 flat
        assert_eq!(fee.net_to_seller, 4_995_000); // KES 49,950
    }

    #[test]
    fn test_kes_conversion() {
        assert_eq!(kes_to_cents(1000.0), 100_000);
        assert_eq!(cents_to_kes(100_000), 1000.0);
    }
}