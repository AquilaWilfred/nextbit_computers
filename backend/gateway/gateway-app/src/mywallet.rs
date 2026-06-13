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
    pub balance_kes:   String,
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
    pub phone:      String,
    pub amount_kes: u64,
}

#[derive(Debug, Serialize)]
pub struct LoadWalletInitiated {
    pub checkout_request_id: String,
    pub message:             String,
    pub amount_kes:          u64,
}

#[derive(Debug, Deserialize)]
pub struct WithdrawRequest {
    pub phone:      String,
    pub amount_kes: u64,
}

// ── Transaction response (replaces models::wallet::WalletTxResponse) ──────────

#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct WalletTx {
    pub id:             Uuid,
    pub card_id:        Uuid,
    pub user_id:        Uuid,
    pub tx_type:        String,
    pub status:         String,
    pub amount_cents:   i64,
    pub fee_cents:      i64,
    pub net_cents:      i64,
    pub balance_before: i64,
    pub balance_after:  i64,
    pub description:    Option<String>,
}

// ── Get or Create Card ─────────────────────────────────────────────────────────

pub async fn get_or_create_card(
    pool:        &PgPool,
    user_id:     Uuid,
    holder_name: &str,
) -> Result<WalletCard, DarajaError> {
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
    .bind(12i16)
    .bind(2029i16)
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
    (nanos as u64) % 100_000_000_000_000
}

// ── Load Wallet via STK Push ───────────────────────────────────────────────────

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
    let reference  = format!("load-{}", card.id);

    let stk = daraja
        .stk_push(&normalized, amount, &reference, "NextBit Wallet Top-Up")
        .await?;

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

pub async fn on_wallet_load_stk_callback(
    pool:          &PgPool,
    checkout_id:   &str,
    result_code:   i32,
    amount_cents:  i64,
    mpesa_receipt: Option<&str>,
) -> Result<(), DarajaError> {
    if result_code != 0 {
        sqlx::query(
            r#"UPDATE wallet_transactions SET status = 'failed'
               WHERE fw_tx_ref = $1 AND status = 'pending'"#,
        )
        .bind(checkout_id)
        .execute(pool)
        .await?;
        return Ok(());
    }

    #[derive(sqlx::FromRow)]
    struct PendingTx {
        tx_id:         Uuid,
        card_id:       Uuid,
        balance_cents: i64,
    }

    let row = sqlx::query_as::<_, PendingTx>(
        r#"
        SELECT wt.id as tx_id, wt.card_id, nc.balance_cents
        FROM wallet_transactions wt
        JOIN nextbit_cards nc ON nc.id = wt.card_id
        WHERE wt.fw_tx_ref = $1 AND wt.status = 'pending'
        "#,
    )
    .bind(checkout_id)
    .fetch_optional(pool)
    .await?;

    let Some(row) = row else {
        tracing::warn!(checkout_id, "Wallet load callback: no pending tx found");
        return Ok(());
    };

    let new_balance = row.balance_cents + amount_cents;
    let mut db_tx   = pool.begin().await?;

    sqlx::query(r#"UPDATE nextbit_cards SET balance_cents = $1 WHERE id = $2"#)
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

pub async fn initiate_wallet_withdrawal(
    pool:    &PgPool,
    daraja:  &DarajaClient,
    user_id: Uuid,
    phone:   &str,
    amount:  u64,
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

    let amount_cents  = (amount * 100) as i64;
    let fee_cents     = compute_platform_fee_cents(amount_cents);
    let net_cents     = amount_cents - fee_cents;
    let net_kes       = (net_cents / 100) as u64;

    if card.balance_cents < amount_cents {
        return Err(DarajaError::InsufficientBalance {
            available: card.balance_cents,
            required:  amount_cents,
        });
    }

    let normalized    = normalise_phone(phone)?;
    let originator_id = format!("withdraw-{}", card.id);

    let b2c_ack = daraja
        .b2c_payment(&originator_id, &normalized, net_kes, "BusinessPayment", "NextBit wallet withdrawal")
        .await?;

    let new_balance = card.balance_cents - amount_cents;
    let mut db_tx   = pool.begin().await?;

    sqlx::query(r#"UPDATE nextbit_cards SET balance_cents = $1 WHERE id = $2"#)
        .bind(new_balance)
        .bind(card.id)
        .execute(&mut *db_tx)
        .await?;

    sqlx::query(
        r#"
        INSERT INTO wallet_transactions
            (card_id, user_id, tx_type, status, amount_cents, fee_cents, net_cents,
             balance_before, balance_after, fw_tx_ref, description)
        VALUES ($1, $2, 'withdrawal', 'pending', $3, $4, $5, $6, $7, $8,
                'M-Pesa withdrawal via B2C')
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
            SET status = 'completed', fw_charge_id = $1
            WHERE fw_tx_ref = $2 AND status = 'pending'
            "#,
        )
        .bind(&result.transaction_i_d)
        .bind(&result.conversation_id)
        .execute(pool)
        .await?;
    } else {
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
            r#"UPDATE wallet_transactions SET status = 'reversed'
               WHERE fw_tx_ref = $1 AND status = 'pending'"#,
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

// ── Pay Order from Wallet ──────────────────────────────────────────────────────
// Buyer pays for an escrow order directly from wallet balance.
// Always internal and fee-free — no M-Pesa or FW involved.

pub async fn pay_order_from_wallet(
    pool:         &PgPool,
    buyer_id:     Uuid,
    escrow_id:    Uuid,
    amount_cents: i64,
) -> Result<WalletTx, DarajaError> {
    let card = sqlx::query_as::<_, WalletCard>(
        r#"SELECT id, user_id, card_number, card_holder, balance_cents, is_active
           FROM nextbit_cards WHERE user_id = $1"#,
    )
    .bind(buyer_id)
    .fetch_one(pool)
    .await
    .map_err(|e| match e {
        sqlx::Error::RowNotFound => DarajaError::NotFound(buyer_id),
        other => DarajaError::Database(other),
    })?;

    if !card.is_active {
        return Err(DarajaError::InvalidState("Wallet card is inactive".into()));
    }
    if card.balance_cents < amount_cents {
        return Err(DarajaError::InsufficientBalance {
            available: card.balance_cents,
            required:  amount_cents,
        });
    }

    let tx = sqlx::query_as::<_, WalletTx>(
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
             balance_before, balance_after,
             escrow_id, description)
        SELECT
            uc.id, $2, 'order_payment', 'completed',
            $1, 0, $1,
            uc.balance_before, uc.balance_after,
            $3, 'Order payment from NextBit wallet'
        FROM updated_card uc
        RETURNING id, card_id, user_id, tx_type, status,
                  amount_cents, fee_cents, net_cents,
                  balance_before, balance_after, description
        "#,
    )
    .bind(amount_cents)
    .bind(buyer_id)
    .bind(escrow_id)
    .fetch_one(pool)
    .await?;

    Ok(tx)
}

// ── Credit Seller Payout ───────────────────────────────────────────────────────
// Called after escrow is released — credits net amount to seller's wallet.

pub async fn credit_seller_payout(
    pool:               &PgPool,
    seller_id:          Uuid,
    escrow_id:          Uuid,
    gross_cents:        i64,
    platform_fee_cents: i64,
) -> Result<WalletTx, DarajaError> {
    let net       = gross_cents - platform_fee_cents;

    let tx = sqlx::query_as::<_, WalletTx>(
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
        RETURNING id, card_id, user_id, tx_type, status,
                  amount_cents, fee_cents, net_cents,
                  balance_before, balance_after, description
        "#,
    )
    .bind(net)
    .bind(seller_id)
    .bind(gross_cents)
    .bind(platform_fee_cents)
    .bind(escrow_id)
    .fetch_one(pool)
    .await?;

    Ok(tx)
}

// ── Get Transaction History ────────────────────────────────────────────────────
// Paginated list of wallet transactions for a user.

pub async fn get_transactions(
    pool:    &PgPool,
    user_id: Uuid,
    limit:   i64,
    offset:  i64,
) -> Result<Vec<WalletTx>, DarajaError> {
    let txs = sqlx::query_as::<_, WalletTx>(
        r#"
        SELECT id, card_id, user_id, tx_type, status,
               amount_cents, fee_cents, net_cents,
               balance_before, balance_after, description
        FROM wallet_transactions
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3
        "#,
    )
    .bind(user_id)
    .bind(limit)
    .bind(offset)
    .fetch_all(pool)
    .await?;

    Ok(txs)
}