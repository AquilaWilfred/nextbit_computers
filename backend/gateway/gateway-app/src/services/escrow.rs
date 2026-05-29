use serde_json::{json, Value};
use sqlx::PgPool;
use uuid::Uuid;

use crate::models::escrow::{
    AdminRuling,
    EscrowAction,
    EscrowError,
    EscrowState,
    EscrowTransaction,
};

// ── Create ─────────────────────────────────────────────────────────────────────

pub async fn create_escrow(
    pool:      &PgPool,
    order_id:  Uuid,
    buyer_id:  Uuid,
    seller_id: Uuid,
    amount:    f64,
    currency:  String,
) -> Result<EscrowTransaction, EscrowError> {
    let tx = sqlx::query_as::<_, EscrowTransaction>(
        r#"
        INSERT INTO escrow_transactions
            (order_id, buyer_id, seller_id, amount, currency)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
        "#,
    )
    .bind(order_id)
    .bind(buyer_id)
    .bind(seller_id)
    .bind(amount)
    .bind(currency)
    .fetch_one(pool)
    .await?;

    Ok(tx)
}

// ── Read ───────────────────────────────────────────────────────────────────────

pub async fn get_escrow(
    pool: &PgPool,
    id:   Uuid,
) -> Result<EscrowTransaction, EscrowError> {
    sqlx::query_as::<_, EscrowTransaction>(
        r#"SELECT * FROM escrow_transactions WHERE id = $1"#,
    )
    .bind(id)
    .fetch_one(pool)
    .await
    .map_err(|e| match e {
        sqlx::Error::RowNotFound => EscrowError::NotFound(id),
        other => EscrowError::Database(other),
    })
}

pub async fn get_escrow_by_fw_tx_ref(
    pool:      &PgPool,
    fw_tx_ref: &str,
) -> Result<EscrowTransaction, EscrowError> {
    sqlx::query_as::<_, EscrowTransaction>(
        r#"SELECT * FROM escrow_transactions WHERE fw_tx_ref = $1"#,
    )
    .bind(fw_tx_ref)
    .fetch_one(pool)
    .await
    .map_err(|e| match e {
        sqlx::Error::RowNotFound => EscrowError::Flutterwave(
            format!("No escrow found for fw_tx_ref: {}", fw_tx_ref)
        ),
        other => EscrowError::Database(other),
    })
}

// ── Initiate Payment ───────────────────────────────────────────────────────────
// Saves fw_tx_ref to the escrow row, then transitions state to PaymentPending.
// Call this BEFORE redirecting the buyer to Flutterwave.

pub async fn save_fw_tx_ref(
    pool:      &PgPool,
    escrow_id: Uuid,
    fw_tx_ref: &str,
) -> Result<EscrowTransaction, EscrowError> {
    let updated = sqlx::query_as::<_, EscrowTransaction>(
        r#"
        UPDATE escrow_transactions
        SET fw_tx_ref = $1
        WHERE id = $2
        RETURNING *
        "#,
    )
    .bind(fw_tx_ref)
    .bind(escrow_id)
    .fetch_one(pool)
    .await?;

    Ok(updated)
}

// ── State Transitions ──────────────────────────────────────────────────────────
// Single source of truth for all state changes.
// Every transition is atomic: UPDATE + audit log INSERT in one DB transaction.

pub async fn apply_transition(
    pool:         &PgPool,
    escrow_id:    Uuid,
    action:       EscrowAction,
    performed_by: Option<Uuid>,
    metadata:     Option<Value>,
) -> Result<EscrowTransaction, EscrowError> {
    let escrow = get_escrow(pool, escrow_id).await?;
    let from_state = escrow.state.clone();

    // ── State machine ──────────────────────────────────────────────────────────
    let new_state = match (escrow.state.clone(), action.clone()) {
        (EscrowState::Created,           EscrowAction::InitiatePayment)   => EscrowState::PaymentPending,
        (EscrowState::PaymentPending,    EscrowAction::PaymentConfirmed)  => EscrowState::FundsHeldInEscrow,
        (EscrowState::PaymentPending,    EscrowAction::PaymentFailed)     => EscrowState::Created,
        (EscrowState::FundsHeldInEscrow, EscrowAction::RaiseDispute)      => EscrowState::DisputeRaised,
        (EscrowState::FundsHeldInEscrow, EscrowAction::ConfirmDelivery)   => EscrowState::DeliveryConfirmed,
        (EscrowState::DisputeRaised,     EscrowAction::AdminPending)      => EscrowState::Waiting,
        (EscrowState::Waiting,           EscrowAction::AdminRuleForBuyer) => EscrowState::Refunded,
        (EscrowState::Waiting,           EscrowAction::AdminRuleForSeller)=> EscrowState::ReleasedToSeller,
        // also allow ruling directly from DisputeRaised (admin skips assignment step)
        (EscrowState::DisputeRaised,     EscrowAction::AdminRuleForBuyer) => EscrowState::Refunded,
        (EscrowState::DisputeRaised,     EscrowAction::AdminRuleForSeller)=> EscrowState::ReleasedToSeller,
        (EscrowState::DeliveryConfirmed, EscrowAction::ReleaseFunds)      => EscrowState::ReleasedToSeller,
        (EscrowState::ReleasedToSeller,  EscrowAction::ReleaseFunds)      => EscrowState::PayoutCompleted,
        (state, _) => return Err(EscrowError::InvalidTransition { state, action }),
    };

    // ── Compute fields that change per action ──────────────────────────────────
    let (admin_id, admin_ruling, admin_ruled_at, dispute_reason, dispute_raised_at, auto_release_at) =
        match &action {
            EscrowAction::AdminRuleForBuyer => (
                performed_by,
                Some("buyer".to_string()),
                Some(chrono::Utc::now()),
                escrow.dispute_reason.clone(),
                escrow.dispute_raised_at,
                None,
            ),
            EscrowAction::AdminRuleForSeller => (
                performed_by,
                Some("seller".to_string()),
                Some(chrono::Utc::now()),
                escrow.dispute_reason.clone(),
                escrow.dispute_raised_at,
                None,
            ),
            EscrowAction::RaiseDispute => {
                let reason = metadata
                    .as_ref()
                    .and_then(|m| m.get("reason"))
                    .and_then(|v| v.as_str())
                    .map(|s| s.to_string())
                    .or(escrow.dispute_reason.clone());
                (
                    escrow.admin_id,
                    escrow.admin_ruling.clone(),
                    escrow.admin_ruled_at,
                    reason,
                    Some(chrono::Utc::now()),  // set dispute_raised_at NOW
                    None,
                )
            }
            EscrowAction::ConfirmDelivery => (
                escrow.admin_id,
                escrow.admin_ruling.clone(),
                escrow.admin_ruled_at,
                escrow.dispute_reason.clone(),
                escrow.dispute_raised_at,
                // auto-release 48h after delivery confirmed
                Some(chrono::Utc::now() + chrono::Duration::hours(48)),
            ),
            _ => (
                escrow.admin_id,
                escrow.admin_ruling.clone(),
                escrow.admin_ruled_at,
                escrow.dispute_reason.clone(),
                escrow.dispute_raised_at,
                escrow.auto_release_at,
            ),
        };

    // ── Atomic: UPDATE escrow + INSERT audit log ───────────────────────────────
    let mut db_tx = pool.begin().await?;

    let updated = sqlx::query_as::<_, EscrowTransaction>(
        r#"
        UPDATE escrow_transactions
        SET
            state              = $1,
            admin_id           = $2,
            admin_ruling       = $3,
            admin_ruled_at     = $4,
            dispute_reason     = $5,
            dispute_raised_at  = $6,
            auto_release_at    = $7
        WHERE id = $8
        RETURNING *
        "#,
    )
    .bind(&new_state)
    .bind(admin_id)
    .bind(&admin_ruling)
    .bind(admin_ruled_at)
    .bind(&dispute_reason)
    .bind(dispute_raised_at)
    .bind(auto_release_at)
    .bind(escrow_id)
    .fetch_one(&mut *db_tx)
    .await?;

    // Write audit log entry
    sqlx::query(
        r#"
        INSERT INTO escrow_audit_log
            (escrow_id, from_state, to_state, action, performed_by, metadata)
        VALUES ($1, $2, $3, $4, $5, $6)
        "#,
    )
    .bind(escrow_id)
    .bind(&from_state)
    .bind(&new_state)
    .bind(format!("{:?}", action))
    .bind(performed_by)
    .bind(&metadata)
    .execute(&mut *db_tx)
    .await?;

    db_tx.commit().await?;

    Ok(updated)
}

// ── raise_dispute ──────────────────────────────────────────────────────────────
// Single call — no double-write. apply_transition handles everything.

pub async fn raise_dispute(
    pool:      &PgPool,
    escrow_id: Uuid,
    buyer_id:  Uuid,
    reason:    String,
) -> Result<EscrowTransaction, EscrowError> {
    apply_transition(
        pool,
        escrow_id,
        EscrowAction::RaiseDispute,
        Some(buyer_id),
        Some(json!({ "reason": reason })),
    )
    .await
}

// ── admin_ruling ───────────────────────────────────────────────────────────────

pub async fn admin_ruling(
    pool:      &PgPool,
    escrow_id: Uuid,
    admin_id:  Uuid,
    ruling:    AdminRuling,
) -> Result<EscrowTransaction, EscrowError> {
    let action = match ruling {
        AdminRuling::Buyer  => EscrowAction::AdminRuleForBuyer,
        AdminRuling::Seller => EscrowAction::AdminRuleForSeller,
    };
    apply_transition(pool, escrow_id, action, Some(admin_id), None).await
}

// ── Look up user UUID by email ─────────────────────────────────────────────────
// Used by handlers to resolve JWT email -> buyer UUID.

pub async fn get_user_id_by_email(
    pool:  &PgPool,
    email: &str,
) -> Result<Uuid, EscrowError> {
    sqlx::query_scalar::<_, Uuid>(
        r#"SELECT "openId" FROM users WHERE email = $1"#,
    )
    .bind(email)
    .fetch_one(pool)
    .await
    .map_err(|e| match e {
        sqlx::Error::RowNotFound => EscrowError::Flutterwave(
            format!("User not found for email: {}", email)
        ),
        other => EscrowError::Database(other),
    })
}