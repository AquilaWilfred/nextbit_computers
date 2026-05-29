use once_cell::sync::Lazy;
use std::collections::HashMap;
use std::sync::Mutex;
use uuid::Uuid;
use chrono::Utc;

use crate::models::escrow::{EscrowResponse, EscrowState, AdminRuling};
use crate::models::escrow::EscrowError;

static STORE: Lazy<Mutex<HashMap<Uuid, EscrowResponse>>> = Lazy::new(|| Mutex::new(HashMap::new()));

pub async fn create_escrow(
    _pg: &sqlx::PgPool,
    order_id: Uuid,
    buyer_id: Uuid,
    seller_id: Uuid,
    amount: f64,
    currency: String,
) -> Result<EscrowResponse, EscrowError> {
    let id = Uuid::new_v4();
    let now = Utc::now();

    let resp = EscrowResponse {
        id,
        order_id,
        amount,
        currency,
        state: EscrowState::Created,
        created_at: now,
        updated_at: now,
    };

    STORE.lock().unwrap().insert(id, resp.clone());
    Ok(resp)
}

pub async fn get_escrow(
    _pg: &sqlx::PgPool,
    id: Uuid,
) -> Result<EscrowResponse, EscrowError> {
    let store = STORE.lock().unwrap();
    store.get(&id).cloned().ok_or(EscrowError::NotFound(id))
}

pub async fn get_escrow_by_fw_tx_ref(
    _pg: &sqlx::PgPool,
    _fw_tx_ref: &str,
) -> Result<EscrowResponse, EscrowError> {
    // in-memory store doesn't track fw_tx_ref; fail fast
    Err(EscrowError::Flutterwave("fw_tx_ref lookup not supported in in-memory mode".into()))
}

pub async fn apply_transition(
    _pg: &sqlx::PgPool,
    escrow_id: Uuid,
    action: crate::models::escrow::EscrowAction,
    _performed_by: Option<Uuid>,
    _metadata: Option<serde_json::Value>,
) -> Result<EscrowResponse, EscrowError> {
    let mut store = STORE.lock().unwrap();
    let mut esc = store.get(&escrow_id).cloned().ok_or(EscrowError::NotFound(escrow_id))?;

    use crate::models::escrow::EscrowAction::*;
    use crate::models::escrow::EscrowState::*;

    esc.state = match (esc.state, action.clone()) {
        (Created, InitiatePayment) => EscrowState::PaymentPending,
        (EscrowState::PaymentPending, PaymentConfirmed) => FundsHeldInEscrow,
        (EscrowState::PaymentPending, PaymentFailed) => Created,
        (FundsHeldInEscrow, crate::models::escrow::EscrowAction::RaiseDispute) => DisputeRaised,
        (FundsHeldInEscrow, crate::models::escrow::EscrowAction::ConfirmDelivery) => DeliveryConfirmed,
        (DeliveryConfirmed, crate::models::escrow::EscrowAction::ReleaseFunds) => PayoutCompleted,
        (DisputeRaised, crate::models::escrow::EscrowAction::AdminRuleForBuyer) => EscrowState::Refunded,
        (DisputeRaised, crate::models::escrow::EscrowAction::AdminRuleForSeller) => EscrowState::ReleasedToSeller,
        (s, _) => return Err(EscrowError::InvalidTransition { state: s, action }),
    };

    esc.updated_at = Utc::now();
    store.insert(escrow_id, esc.clone());
    Ok(esc)
}

pub async fn raise_dispute(
    pool: &sqlx::PgPool,
    escrow_id: Uuid,
    buyer_id: Uuid,
    reason: String,
) -> Result<EscrowResponse, EscrowError> {
    // For in-memory test, just call apply_transition
    let _ = (pool, buyer_id, reason);
    apply_transition(pool, escrow_id, crate::models::escrow::EscrowAction::RaiseDispute, Some(buyer_id), None).await
}

pub async fn admin_ruling(
    pool: &sqlx::PgPool,
    escrow_id: Uuid,
    admin_id: Uuid,
    ruling: AdminRuling,
) -> Result<EscrowResponse, EscrowError> {
    let action = match ruling {
        AdminRuling::Buyer => crate::models::escrow::EscrowAction::AdminRuleForBuyer,
        AdminRuling::Seller => crate::models::escrow::EscrowAction::AdminRuleForSeller,
    };
    apply_transition(pool, escrow_id, action, Some(admin_id), None).await
}
