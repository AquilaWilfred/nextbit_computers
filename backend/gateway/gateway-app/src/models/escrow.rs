use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

// ── State Machine ──────────────────────────────────────────────────────────────

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, sqlx::Type)]
#[sqlx(type_name = "escrow_state", rename_all = "snake_case")]
#[serde(rename_all = "snake_case")]
pub enum EscrowState {
    Created,
    PaymentPending,
    FundsHeldInEscrow,
    DisputeRaised,
    Waiting,               // admin assigned, not yet ruled
    DeliveryConfirmed,
    ReleasedToSeller,
    Refunded,
    PayoutCompleted,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum EscrowAction {
    InitiatePayment,       // buyer goes to checkout
    PaymentConfirmed,      // flutterwave webhook: charge.completed + successful
    PaymentFailed,         // flutterwave webhook: charge.completed + failed
    RaiseDispute,          // buyer opens dispute
    ConfirmDelivery,       // buyer confirms they received item
    AdminPending,          // admin assigned to dispute (DisputeRaised -> Waiting)
    AdminRuleForBuyer,     // admin rules: refund buyer
    AdminRuleForSeller,    // admin rules: release to seller
    ReleaseFunds,          // auto-release timer fires OR manual release after seller ruling
}

#[derive(Debug, thiserror::Error)]
pub enum EscrowError {
    #[error("Invalid transition from {state:?} with action {action:?}")]
    InvalidTransition {
        state:  EscrowState,
        action: EscrowAction,
    },

    #[error("Database error: {0}")]
    Database(#[from] sqlx::Error),

    #[error("Flutterwave error: {0}")]
    Flutterwave(String),

    #[error("Escrow transaction not found: {0}")]
    NotFound(Uuid),

    #[error("Concurrent modification detected — please retry")]
    ConcurrentModification,
}

// ── DB Row ─────────────────────────────────────────────────────────────────────

#[derive(Debug, Clone, FromRow)]
pub struct EscrowTransaction {
    pub id:               Uuid,
    pub order_id:         Uuid,
    pub buyer_id:         Uuid,
    pub seller_id:        Uuid,
    pub amount:           sqlx::types::BigDecimal,
    pub currency:         String,
    pub state:            EscrowState,

    // flutterwave refs
    pub fw_tx_ref:        Option<String>,
    pub fw_transfer_id:   Option<String>,
    pub fw_charge_id:     Option<String>,

    // dispute
    pub dispute_reason:   Option<String>,
    pub dispute_raised_at:Option<DateTime<Utc>>,
    pub admin_id:         Option<Uuid>,
    pub admin_ruling:     Option<String>,
    pub admin_ruled_at:   Option<DateTime<Utc>>,

    // auto-release
    pub auto_release_at:  Option<DateTime<Utc>>,

    pub created_at:       DateTime<Utc>,
    pub updated_at:       DateTime<Utc>,
}

// ── Audit Log Row ──────────────────────────────────────────────────────────────

#[derive(Debug, Clone, FromRow)]
pub struct EscrowAuditLog {
    pub id:           Uuid,
    pub escrow_id:    Uuid,
    pub from_state:   Option<EscrowState>,
    pub to_state:     EscrowState,
    pub action:       String,
    pub performed_by: Option<Uuid>,
    pub metadata:     Option<serde_json::Value>,
    pub created_at:   DateTime<Utc>,
}

// ── Request / Response DTOs ────────────────────────────────────────────────────

#[derive(Debug, Deserialize)]
pub struct CreateEscrowRequest {
    pub order_id:  Uuid,
    pub seller_id: Uuid,
    pub amount:    f64,
    pub currency:  Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct InitiatePaymentRequest {
    pub buyer_email: String,   // used to build Flutterwave customer object
    pub buyer_name:  String,
    pub redirect_url: String,  // where FW sends buyer after payment
}

#[derive(Debug, Serialize)]
pub struct InitiatePaymentResponse {
    pub payment_url: String,   // redirect buyer here
    pub fw_tx_ref:   String,   // save this — webhook uses it to find escrow
}

#[derive(Debug, Deserialize)]
pub struct RaiseDisputeRequest {
    pub reason: String,
}

#[derive(Debug, Deserialize)]
pub struct AdminRulingRequest {
    pub ruling: AdminRuling,
}

#[derive(Debug, Serialize, Deserialize, PartialEq, Clone)]
#[serde(rename_all = "snake_case")]
pub enum AdminRuling {
    Buyer,
    Seller,
}

// ── API Response ───────────────────────────────────────────────────────────────
// amount uses String to avoid f64 precision loss on financial values.

#[derive(Debug, Serialize, Clone)]
pub struct EscrowResponse {
    pub id:         Uuid,
    pub order_id:   Uuid,
    pub amount:     String,   // String, not f64 — avoids lossy float conversion
    pub currency:   String,
    pub state:      EscrowState,
    pub fw_tx_ref:  Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

impl From<EscrowTransaction> for EscrowResponse {
    fn from(e: EscrowTransaction) -> Self {
        Self {
            id:         e.id,
            order_id:   e.order_id,
            amount:     e.amount.to_string(),
            currency:   e.currency,
            state:      e.state,
            fw_tx_ref:  e.fw_tx_ref,
            created_at: e.created_at,
            updated_at: e.updated_at,
        }
    }
}