// ── src/services/wallet.rs ─────────────────────────────────────────────────────

use chrono::{Datelike, Utc};
use rand::Rng;
use sqlx::PgPool;
use uuid::Uuid;

use crate::{
    models::wallet::{
        CardResponse, NextbitCard, WalletTransaction,
        WalletTxStatus, WalletTxType,
    },
    services::fee::{
        self, calculate_load_fee, calculate_withdrawal_fee,
        kes_to_cents, PaymentMethod, MIN_FIRST_LOAD_CENTS, MIN_TOPUP_LOAD_CENTS,
    },
};

// ── Errors ─────────────────────────────────────────────────────────────────────

#[derive(Debug, thiserror::Error)]
pub enum WalletError {
    #[error("Database error: {0}")]
    Database(#[from] sqlx::Error),

    #[error("Insufficient balance: have {have_kes} KES, need {need_kes} KES")]
    InsufficientBalance { have_kes: f64, need_kes: f64 },

    #[error("Minimum load is KES {min_kes}")]
    BelowMinimumLoad { min_kes: f64 },

    #[error("Card not found for user")]
    CardNotFound,

    #[error("Card is inactive")]
    CardInactive,

    #[error("Flutterwave error: {0}")]
    Flutterwave(String),
}

// ── Card Management ────────────────────────────────────────────────────────────

/// Create a NextBit virtual card for a new user
pub async fn create_card(
    pool:        &PgPool,
    user_id:     Uuid,
    holder_name: String,
) -> Result<NextbitCard, WalletError> {
    let card_number  = generate_card_number();
    let now          = Utc::now();
    // card expires 4 years from now
    let expiry_month = now.month() as i16;
    let expiry_year  = (now.year() + 4) as i16;

    let card = sqlx::query_as!(
        NextbitCard,
        r#"
        INSERT INTO nextbit_cards
            (user_id, card_number, card_holder, expiry_month, expiry_year)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
        "#,
        user_id,
        card_number,
        holder_name,
        expiry_month,
        expiry_year,
    )
    .fetch_one(pool)
    .await?;

    Ok(card)
}

/// Get card by user_id
pub async fn get_card(
    pool:    &PgPool,
    user_id: Uuid,
) -> Result<NextbitCard, WalletError> {
    sqlx::query_as!(
        NextbitCard,
        r#"SELECT * FROM nextbit_cards WHERE user_id = $1"#,
        user_id
    )
    .fetch_optional(pool)
    .await?
    .ok_or(WalletError::CardNotFound)
}

// ── Wallet Load ────────────────────────────────────────────────────────────────

/// Credit wallet after Flutterwave confirms payment
/// Called from the webhook handler after charge.completed verified
pub async fn credit_wallet_after_load(
    pool:         &PgPool,
    user_id:      Uuid,
    amount_cents: i64,
    method:       &PaymentMethod,
    fw_tx_ref:    &str,
    fw_charge_id: &str,
    is_first_load: bool,
) -> Result<WalletTransaction, WalletError> {
    // enforce minimum load
    let minimum = if is_first_load {
        MIN_FIRST_LOAD_CENTS
    } else {
        MIN_TOPUP_LOAD_CENTS
    };

    if amount_cents < minimum {
        return Err(WalletError::BelowMinimumLoad {
            min_kes: minimum as f64 / 100.0,
        });
    }

    let fees     = calculate_load_fee(amount_cents, method);
    let net      = fees.net_to_wallet;
    let tx_type  = method_to_load_type(method);

    // atomic: update balance + record transaction
    let tx = sqlx::query_as!(
        WalletTransaction,
        r#"
        WITH updated_card AS (
            UPDATE nextbit_cards
            SET balance_cents = balance_cents + $1
            WHERE user_id = $2 AND is_active = TRUE
            RETURNING id, balance_cents - $1 AS balance_before, balance_cents AS balance_after
        )
        INSERT INTO wallet_transactions
            (card_id, user_id, tx_type, status,
             amount_cents, fee_cents, net_cents,
             balance_before, balance_after,
             fw_tx_ref, fw_charge_id, description)
        SELECT
            uc.id, $2, $3, 'completed',
            $4, $5, $1,
            uc.balance_before, uc.balance_after,
            $6, $7, $8
        FROM updated_card uc
        RETURNING *
        "#,
        net,
        user_id,
        tx_type    as WalletTxType,
        amount_cents,
        fees.fw_fee_cents,
        fw_tx_ref,
        fw_charge_id,
        format!("Wallet load via {:?}", method),
    )
    .fetch_one(pool)
    .await?;

    Ok(tx)
}

// ── Order Payment from Wallet ──────────────────────────────────────────────────

/// Deduct from buyer wallet, lock in escrow
/// wallet-to-wallet = no Flutterwave fee
pub async fn pay_order_from_wallet(
    pool:         &PgPool,
    buyer_id:     Uuid,
    escrow_id:    Uuid,
    amount_cents: i64,
) -> Result<WalletTransaction, WalletError> {
    let card = get_card(pool, buyer_id).await?;

    if !card.is_active {
        return Err(WalletError::CardInactive);
    }

    if card.balance_cents < amount_cents {
        return Err(WalletError::InsufficientBalance {
            have_kes: card.balance_cents as f64 / 100.0,
            need_kes: amount_cents       as f64 / 100.0,
        });
    }

    // atomic deduct + record
    let tx = sqlx::query_as!(
        WalletTransaction,
        r#"
        WITH updated_card AS (
            UPDATE nextbit_cards
            SET balance_cents = balance_cents - $1
            WHERE user_id = $2
              AND is_active = TRUE
              AND balance_cents >= $1        -- prevent negative balance
            RETURNING id,
                      balance_cents + $1 AS balance_before,
                      balance_cents      AS balance_after
        )
        INSERT INTO wallet_transactions
            (card_id, user_id, tx_type, status,
             amount_cents, fee_cents, net_cents,
             balance_before, balance_after,
             escrow_id, description)
        SELECT
            uc.id, $2, 'order_payment', 'completed',
            $1, 0, $1,
            uc.balance_before, uc.balance_after,
            $3, 'Order payment from NextBit wallet'
        FROM updated_card uc
        RETURNING *
        "#,
        amount_cents,
        buyer_id,
        escrow_id,
    )
    .fetch_one(pool)
    .await?;

    // if no rows updated = insufficient balance race condition
    Ok(tx)
}

// ── Seller Payout to Wallet ────────────────────────────────────────────────────

/// Credit seller wallet after escrow releases
pub async fn credit_seller_payout(
    pool:              &PgPool,
    seller_id:         Uuid,
    escrow_id:         Uuid,
    gross_cents:       i64,
    platform_fee_cents:i64,
    fw_fee_share_cents:i64,
) -> Result<WalletTransaction, WalletError> {
    let net = gross_cents - platform_fee_cents - fw_fee_share_cents;

    let tx = sqlx::query_as!(
        WalletTransaction,
        r#"
        WITH updated_card AS (
            UPDATE nextbit_cards
            SET balance_cents = balance_cents + $1
            WHERE user_id = $2 AND is_active = TRUE
            RETURNING id,
                      balance_cents - $1 AS balance_before,
                      balance_cents      AS balance_after
        )
        INSERT INTO wallet_transactions
            (card_id, user_id, tx_type, status,
             amount_cents, fee_cents, net_cents,
             balance_before, balance_after,
             escrow_id, description)
        SELECT
            uc.id, $2, 'seller_payout', 'completed',
            $3, $4, $1,
            uc.balance_before, uc.balance_after,
            $5, 'Seller payout from escrow'
        FROM updated_card uc
        RETURNING *
        "#,
        net,
        seller_id,
        gross_cents,
        platform_fee_cents + fw_fee_share_cents,
        escrow_id,
    )
    .fetch_one(pool)
    .await?;

    Ok(tx)
}

// ── Seller Withdrawal ──────────────────────────────────────────────────────────

pub async fn initiate_withdrawal(
    pool:         &PgPool,
    seller_id:    Uuid,
    amount_cents: i64,
) -> Result<WalletTransaction, WalletError> {
    let fees = calculate_withdrawal_fee(amount_cents);
    let net  = fees.net_to_seller;

    if net <= 0 {
        return Err(WalletError::InsufficientBalance {
            have_kes: 0.0,
            need_kes: fee::cents_to_kes(amount_cents),
        });
    }

    let tx = sqlx::query_as!(
        WalletTransaction,
        r#"
        WITH updated_card AS (
            UPDATE nextbit_cards
            SET balance_cents = balance_cents - $1
            WHERE user_id = $2
              AND is_active = TRUE
              AND balance_cents >= $1
            RETURNING id,
                      balance_cents + $1 AS balance_before,
                      balance_cents      AS balance_after
        )
        INSERT INTO wallet_transactions
            (card_id, user_id, tx_type, status,
             amount_cents, fee_cents, net_cents,
             balance_before, balance_after, description)
        SELECT
            uc.id, $2, 'withdrawal', 'pending',
            $1, $3, $4,
            uc.balance_before, uc.balance_after,
            'Withdrawal to bank/M-Pesa'
        FROM updated_card uc
        RETURNING *
        "#,
        amount_cents,
        seller_id,
        fees.fw_fee_cents,
        net,
    )
    .fetch_one(pool)
    .await?;

    Ok(tx)
}

// ── Transaction History ────────────────────────────────────────────────────────

pub async fn get_transactions(
    pool:    &PgPool,
    user_id: Uuid,
    limit:   i64,
    offset:  i64,
) -> Result<Vec<WalletTransaction>, WalletError> {
    let txs = sqlx::query_as!(
        WalletTransaction,
        r#"
        SELECT * FROM wallet_transactions
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3
        "#,
        user_id,
        limit,
        offset,
    )
    .fetch_all(pool)
    .await?;

    Ok(txs)
}

// ── Internal Helpers ───────────────────────────────────────────────────────────

fn generate_card_number() -> String {
    // prefix NB43 (NextBit, 43 = Kenya calling code)
    let mut rng = rand::thread_rng();
    format!(
        "NB43{:04}{:04}{:04}",
        rng.gen_range(1000..9999),
        rng.gen_range(1000..9999),
        rng.gen_range(1000..9999),
    )
}

fn method_to_load_type(method: &PaymentMethod) -> WalletTxType {
    match method {
        PaymentMethod::Mpesa        => WalletTxType::LoadMpesa,
        PaymentMethod::Card         => WalletTxType::LoadCard,
        PaymentMethod::BankTransfer => WalletTxType::LoadBank,
        PaymentMethod::Wallet       => WalletTxType::LoadBank,
    }
}