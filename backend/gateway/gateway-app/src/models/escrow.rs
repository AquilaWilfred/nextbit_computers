use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

// ── State Machine ──────────────────────────────────────────────────────────────

/// Current state of an escrow transaction.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, sqlx::Type, utoipa::ToSchema)]
#[sqlx(type_name = "escrow_state", rename_all = "snake_case")]
#[serde(rename_all = "snake_case")]
pub enum EscrowState {
    Created,
    PaymentPending,
    FundsHeldInEscrow,
    DisputeRaised,
    /// Admin assigned, not yet ruled
    Waiting,
    DeliveryConfirmed,
    ReleasedToSeller,
    Refunded,
    PayoutCompleted,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum EscrowAction {
    InitiatePayment,
    PaymentConfirmed,
    PaymentFailed,
    RaiseDispute,
    ConfirmDelivery,
    AdminPending,
    AdminRuleForBuyer,
    AdminRuleForSeller,
    ReleaseFunds,
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
// Raw database row — not exposed directly in API responses, no ToSchema needed.

#[derive(Debug, Clone, FromRow)]
pub struct EscrowTransaction {
    pub id:                Uuid,
    pub order_id:          Uuid,
    pub buyer_id:          Uuid,
    pub seller_id:         Uuid,
    pub amount:            sqlx::types::BigDecimal,
    pub currency:          String,
    pub state:             EscrowState,

    pub fw_tx_ref:         Option<String>,
    pub fw_transfer_id:    Option<String>,
    pub fw_charge_id:      Option<String>,

    pub dispute_reason:    Option<String>,
    pub dispute_raised_at: Option<DateTime<Utc>>,
    pub admin_id:          Option<Uuid>,
    pub admin_ruling:      Option<String>,
    pub admin_ruled_at:    Option<DateTime<Utc>>,

    pub auto_release_at:   Option<DateTime<Utc>>,

    pub created_at:        DateTime<Utc>,
    pub updated_at:        DateTime<Utc>,
}

// ── Audit Log Row ──────────────────────────────────────────────────────────────
// Internal only — not exposed in API responses, no ToSchema needed.

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
// ⚠️  FLUTTERWAVE ENDPOINTS ARE DEPRECATED — being phased out in favour of Daraja.
//     Kept for reference and gradual migration. Do not build new features on these.
//     All handlers using these types are marked `deprecated = true` in Scalar.

/// Create a new escrow transaction.
///
/// > ⚠️ **Deprecated — not currently active.**
/// > Flutterwave integration is being phased out.
/// > Use the **Daraja (M-Pesa)** escrow endpoints instead:
/// > `POST /api/escrow/{escrow_id}/daraja/pay`
#[derive(Debug, Deserialize, utoipa::ToSchema)]
pub struct CreateEscrowRequest {
    /// UUID of the order this escrow covers.
    #[serde(alias = "order_id")]
    pub order_id:  Uuid,
    /// UUID of the seller receiving funds on release.
    pub seller_id: Uuid,
    /// Transaction amount in the specified currency.
    pub amount:    f64,
    /// ISO 4217 currency code, defaults to `"KES"` if omitted.
    pub currency:  Option<String>,
}

/// Initiate a Flutterwave checkout for an escrow.
///
/// > ⚠️ **Deprecated — not currently active.**
/// > Use `POST /api/escrow/{escrow_id}/daraja/pay` instead.
#[derive(Debug, Deserialize, utoipa::ToSchema)]
pub struct InitiatePaymentRequest {
    /// Buyer's email address — used to build the Flutterwave customer object.
    pub buyer_email:  String,
    /// Buyer's display name shown on the Flutterwave checkout page.
    pub buyer_name:   String,
    /// URL Flutterwave redirects the buyer to after payment completes or fails.
    pub redirect_url: String,
}

/// Flutterwave checkout URL returned after payment initiation.
///
/// > ⚠️ **Deprecated — not currently active.**
#[derive(Debug, Serialize, utoipa::ToSchema)]
pub struct InitiatePaymentResponse {
    /// Redirect the buyer to this URL to complete payment.
    pub payment_url: String,
    /// Flutterwave transaction reference — stored and matched in the webhook.
    pub fw_tx_ref:   String,
}

/// Raise a dispute on an escrow transaction.
#[derive(Debug, Deserialize, utoipa::ToSchema)]
pub struct RaiseDisputeRequest {
    /// Description of the dispute reason.
    pub reason: String,
}

/// Admin ruling on a disputed escrow.
#[derive(Debug, Deserialize, utoipa::ToSchema)]
pub struct AdminRulingRequest {
    pub ruling: AdminRuling,
}

/// Who the admin rules in favour of.
#[derive(Debug, Serialize, Deserialize, PartialEq, Clone, utoipa::ToSchema)]
#[serde(rename_all = "snake_case")]
pub enum AdminRuling {
    /// Refund funds to the buyer.
    Buyer,
    /// Release funds to the seller.
    Seller,
}

/// Escrow transaction summary returned in API responses.
///
/// `amount` is a string to avoid floating-point precision loss on financial values.
#[derive(Debug, Serialize, Clone, utoipa::ToSchema)]
pub struct EscrowResponse {
    pub id:        Uuid,
    pub order_id:  Uuid,
    /// Amount as a decimal string, e.g. `"5000.00"`.
    pub amount:    String,
    pub currency:  String,
    pub state:     EscrowState,
    /// Flutterwave transaction reference, present after payment is initiated.
    pub fw_tx_ref: Option<String>,
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