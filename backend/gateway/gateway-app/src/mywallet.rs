// ── MyWallet Service (Daraja-backed) ──────────────────────────────────────────
// Replaces the Flutterwave wallet with an M-Pesa backed wallet.
// Uses the existing wallet schema (nextbit_cards + wallet_transactions).
//
// Key difference from flutterwave wallet:
//   - Load: STK Push (buyer enters M-Pesa PIN) instead of FW VAN
//   - Withdraw: B2C to seller's phone instead of FW transfer
//   - Balance stored in balance_cents (same schema, no migration needed)

use sqlx::PgPool;
use uuid::Uuid;
use serde::{Deserialize, Serialize};

use crate::models::daraja_escrow::{DarajaError, normalise_phone};
use crate::daraja::DarajaClient;
use crate::daraja::b2c::B2cResultBody;
use crate::services::fee::compute_platform_fee_cents;

// ── Card / Wallet Models ───────────────────────────────────────────────────────
// These map to the existing nextbit_cards table — no migration needed.

#[derive(Debug, sqlx::FromRow)]
pub struct WalletCard {
    pub id:             Uuid,
    pub user_id:        Uuid,
    pub card_number:    String,
    pub card_holder:    String,
    pub balance_cents:  i64,
    pub is_active:      bool,
}

#[derive(Debug, Serialize)]
pub struct WalletCardResponse {
    pub id:            Uuid,
    pub card_number:   String,
    pub card_holder:   String,
    pub balance_kes:   String,   // "1500.00" — never float
    pub is_active:     bool,
}

impl From<WalletCard> for WalletCardResponse {
    fn from(c: WalletCard) -> Self {
        Self {
            id:          c.id,
            card_number: c.card_number,
            card_holder: c.card_holder,
            balance_kes: format!("{:.2}", c.balance_cents as f64 / 100.0),
            is_active:   c.is_active,
        }
    }
}

// ── DTOs ───────────────────────────────────────────────────────────────────────

#[derive(Debug, Deserialize)]
pub struct LoadWalletRequest {
    pub phone:      String,   // buyer's Mpesa phone
    pub amount_kes: u64,      // how much to load
}

#[derive(Debug, Serialize)]
pub struct LoadWalletInitiated {
    pub checkout_request_id: String,
    pub message:             String,
    pub amount_kes:          u64,
}

#[derive(Debug, Deserialize)]
pub struct WithdrawRequest {
    pub phone:      String,   // seller's Mpesa phone to withdraw to
    pub amount_kes: u64,
}

// ── Get or Create Card ─────────────────────────────────────────────────────────

pub async fn get_or_create_card(
    pool:        &PgPool,
    user_id:     Uuid,
    holder_name: &str,
) -> Result<WalletCard, DarajaError> {
    // Try get first
    let existing = sqlx::query_as::<_, WalletCard>(
        r#"SELECT id, user_id, card_number, card_holder, balance_cents, is_active
           FROM nextbit_cards WHERE user_id = $1"#,
    )
    .bind(user_id)
    .fetch_optional(pool)
    .await?;

    if let Some(card) = existing {
        return Ok(card);
    }

    // Generate card number: NB + 14 random digits
    let card_number = format!("NB{:014}", rand_card_suffix());

    let card = sqlx::query_as::<_, WalletCard>(
        r#"
        INSERT INTO nextbit_cards (user_id, card_number, card_holder, expiry_month, expiry_year)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, user_id, card_number, card_holder, balance_cents, is_active
        "#,
    )
    .bind(user_id)
    .bind(&card_number)
    .bind(holder_name)
    .bind(12i16)    // December
    .bind(2029i16)  // 3-year validity
    .fetch_one(pool)
    .await?;

    Ok(card)
}

fn rand_card_suffix() -> u64 {
    use std::time::{SystemTime, UNIX_EPOCH};
    let nanos = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .subsec_nanos();
    // Simple — for prod use a CSPRNG
    (nanos as u64) % 100_000_000_000_000
}

// ── Load Wallet via STK Push ───────────────────────────────────────────────────
// User wants to top up their NextBit wallet with M-Pesa.

pub async fn initiate_wallet_load(
    pool:    &PgPool,
    daraja:  &DarajaClient,
    user_id: Uuid,
    phone:   &str,
    amount:  u64,
) -> Result<LoadWalletInitiated, DarajaError> {
    let card = sqlx::query_as::<_, WalletCard>(
        r#"SELECT id, user_id, card_number, card_holder, balance_cents, is_active
           FROM nextbit_cards WHERE user_id = $1"#,
    )
    .bind(user_id)
    .fetch_one(pool)
    .await
    .map_err(|e| match e {
        sqlx::Error::RowNotFound => DarajaError::NotFound(user_id),
        other => DarajaError::Database(other),
    })?;

    let normalized = normalise_phone(phone)?;

    // Reference: "load-{card_id}" — used to match STK callback
    let reference = format!("load-{}", card.id);

    let stk = daraja
        .stk_push(
            &normalized,
            amount,
            &reference,
            "NextBit Wallet Top-Up",
        )
        .await?;

    // Record a pending wallet transaction
    sqlx::query(
        r#"
        INSERT INTO wallet_transactions
            (card_id, user_id, tx_type, status, amount_cents, fee_cents, net_cents,
             balance_before, balance_after, fw_tx_ref, description)
        VALUES ($1, $2, 'load_mpesa', 'pending', $3, 0, $3,
                $4, $4, $5, 'M-Pesa top-up via STK push')
        "#,
    )
    .bind(card.id)
    .bind(user_id)
    .bind((amount * 100) as i64)
    .bind(card.balance_cents)
    .bind(&stk.checkout_request_id)
    .execute(pool)
    .await?;

    Ok(LoadWalletInitiated {
        checkout_request_id: stk.checkout_request_id,
        message: "Check your phone for M-Pesa payment prompt".into(),
        amount_kes: amount,
    })
}

// ── On Wallet Load STK Callback ────────────────────────────────────────────────
// Daraja calls back after buyer pays.
// account_reference from the callback is "load-{card_id}".

pub async fn on_wallet_load_stk_callback(
    pool:           &PgPool,
    checkout_id:    &str,
    result_code:    i32,
    amount_cents:   i64,
    mpesa_receipt:  Option<&str>,
) -> Result<(), DarajaError> {
    if result_code != 0 {
        // Mark the pending transaction as failed
        sqlx::query(
            r#"
            UPDATE wallet_transactions
            SET status = 'failed'
            WHERE fw_tx_ref = $1 AND status = 'pending'
            "#,
        )
        .bind(checkout_id)
        .execute(pool)
        .await?;
        return Ok(());
    }

    // Fetch the pending transaction to get card_id and current balance
    let row = sqlx::query!(
        r#"
        SELECT wt.id as tx_id, wt.card_id, nc.balance_cents
        FROM wallet_transactions wt
        JOIN nextbit_cards nc ON nc.id = wt.card_id
        WHERE wt.fw_tx_ref = $1 AND wt.status = 'pending'
        "#,
        checkout_id
    )
    .fetch_optional(pool)
    .await?;

    let Some(row) = row else {
        tracing::warn!(checkout_id, "Wallet load callback: no pending tx found");
        return Ok(());
    };

    let new_balance = row.balance_cents + amount_cents;

    // Atomic: update card balance + complete wallet tx
    let mut db_tx = pool.begin().await?;

    sqlx::query(
        r#"
        UPDATE nextbit_cards
        SET balance_cents = $1
        WHERE id = $2
        "#,
    )
    .bind(new_balance)
    .bind(row.card_id)
    .execute(&mut *db_tx)
    .await?;

    sqlx::query(
        r#"
        UPDATE wallet_transactions
        SET status         = 'completed',
            net_cents      = $1,
            balance_before = $2,
            balance_after  = $3,
            fw_charge_id   = $4
        WHERE id = $5
        "#,
    )
    .bind(amount_cents)
    .bind(row.balance_cents)
    .bind(new_balance)
    .bind(mpesa_receipt)
    .bind(row.tx_id)
    .execute(&mut *db_tx)
    .await?;

    db_tx.commit().await?;

    Ok(())
}

// ── Withdraw from Wallet via B2C ───────────────────────────────────────────────
// Seller wants to move wallet balance to their Mpesa.

pub async fn initiate_wallet_withdrawal(
    pool:      &PgPool,
    daraja:    &DarajaClient,
    user_id:   Uuid,
    phone:     &str,
    amount:    u64,
) -> Result<String, DarajaError> {
    let card = sqlx::query_as::<_, WalletCard>(
        r#"SELECT id, user_id, card_number, card_holder, balance_cents, is_active
           FROM nextbit_cards WHERE user_id = $1"#,
    )
    .bind(user_id)
    .fetch_one(pool)
    .await
    .map_err(|e| match e {
        sqlx::Error::RowNotFound => DarajaError::NotFound(user_id),
        other => DarajaError::Database(other),
    })?;

    let amount_cents = (amount * 100) as i64;
    let fee_cents = compute_platform_fee_cents(amount_cents);
    let net_cents = amount_cents - fee_cents;
    let net_kes = (net_cents / 100) as u64;

    if card.balance_cents < amount_cents {
        return Err(DarajaError::InsufficientBalance {
            available: card.balance_cents,
            required: amount_cents,
        });
    }

    let normalized = normalise_phone(phone)?;
    let originator_id = format!("withdraw-{}", card.id);

    let b2c_ack = daraja
        .b2c_payment(
            &originator_id,
            &normalized,
            net_kes,
            "BusinessPayment",
            "NextBit wallet withdrawal",
        )
        .await?;

    // Deduct balance immediately (holds it); reverse on B2C failure
    let new_balance = card.balance_cents - amount_cents;

    let mut db_tx = pool.begin().await?;

    sqlx::query(
        r#"UPDATE nextbit_cards SET balance_cents = $1 WHERE id = $2"#,
    )
    .bind(new_balance)
    .bind(card.id)
    .execute(&mut *db_tx)
    .await?;

    sqlx::query(
        r#"
        INSERT INTO wallet_transactions
            (card_id, user_id, tx_type, status, amount_cents, fee_cents, net_cents,
             balance_before, balance_after, fw_tx_ref, description)
        VALUES ($1, $2, 'withdrawal', 'pending', $3, $4, $5,
                $6, $7, $8, 'M-Pesa withdrawal via B2C')
        "#,
    )
    .bind(card.id)
    .bind(user_id)
    .bind(amount_cents)
    .bind(fee_cents)
    .bind(net_cents)
    .bind(card.balance_cents)
    .bind(new_balance)
    .bind(&b2c_ack.conversation_id)
    .execute(&mut *db_tx)
    .await?;

    db_tx.commit().await?;

    Ok(b2c_ack.conversation_id)
}

// ── On Withdrawal B2C Result ───────────────────────────────────────────────────

pub async fn on_withdrawal_result(
    pool:   &PgPool,
    result: B2cResultBody,
) -> Result<(), DarajaError> {
    if result.is_success() {
        sqlx::query(
            r#"
            UPDATE wallet_transactions
            SET status       = 'completed',
                fw_charge_id = $1
            WHERE fw_tx_ref = $2 AND status = 'pending'
            "#,
        )
        .bind(&result.transaction_i_d)
        .bind(&result.conversation_id)
        .execute(pool)
        .await?;
    } else {
        // Reverse the balance deduction
        sqlx::query(
            r#"
            UPDATE nextbit_cards nc
            SET balance_cents = nc.balance_cents + wt.amount_cents
            FROM wallet_transactions wt
            WHERE wt.card_id = nc.id
              AND wt.fw_tx_ref = $1
              AND wt.status = 'pending'
            "#,
        )
        .bind(&result.conversation_id)
        .execute(pool)
        .await?;

        sqlx::query(
            r#"
            UPDATE wallet_transactions
            SET status = 'reversed'
            WHERE fw_tx_ref = $1 AND status = 'pending'
            "#,
        )
        .bind(&result.conversation_id)
        .execute(pool)
        .await?;

        tracing::error!(
            conversation_id = %result.conversation_id,
            result_code = result.result_code,
            "Withdrawal B2C failed — balance reversed"
        );
    }

    Ok(())
}

// ── Get Balance ────────────────────────────────────────────────────────────────

pub async fn get_wallet_balance(
    pool:    &PgPool,
    user_id: Uuid,
) -> Result<WalletCardResponse, DarajaError> {
    let card = sqlx::query_as::<_, WalletCard>(
        r#"SELECT id, user_id, card_number, card_holder, balance_cents, is_active
           FROM nextbit_cards WHERE user_id = $1"#,
    )
    .bind(user_id)
    .fetch_one(pool)
    .await
    .map_err(|e| match e {
        sqlx::Error::RowNotFound => DarajaError::NotFound(user_id),
        other => DarajaError::Database(other),
    })?;

    Ok(card.into())
}