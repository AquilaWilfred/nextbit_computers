// ── Daraja Escrow Models ───────────────────────────────────────────────────────
// Extends the existing escrow model with Daraja-specific fields and error types.
// The existing EscrowState, EscrowAction, EscrowTransaction remain unchanged.

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

// ── Error Type ─────────────────────────────────────────────────────────────────

#[derive(Debug, thiserror::Error)]
pub enum DarajaError {
    #[error("HTTP error: {0}")]
    Http(String),

    #[error("Database error: {0}")]
    Database(#[from] sqlx::Error),

    #[error("Payment amount mismatch: expected {expected}, got {actual}")]
    AmountMismatch { expected: u64, actual: u64 },

    #[error("Escrow not found: {0}")]
    NotFound(Uuid),

    #[error("Invalid escrow state for action: {0}")]
    InvalidState(String),

    #[error("Daraja callback verification failed")]
    CallbackVerificationFailed,

    #[error("Tax remittance failed: {0}")]
    TaxFailed(String),

    #[error("Insufficient balance: available {available} KES, required {required} KES")]
    InsufficientBalance { available: i64, required: i64 },

    #[error("Concurrent modification — please retry")]
    ConcurrentModification,
}

// ── Daraja Escrow Row ──────────────────────────────────────────────────────────
// Separate table — references escrow_transactions.id
// Keeps all Daraja-specific data isolated from existing FW columns.

#[derive(Debug, Clone, FromRow)]
pub struct DarajaEscrowRecord {
    pub id:                     Uuid,
    pub escrow_id:              Uuid,

    pub mpesa_checkout_id:      Option<String>,
    pub mpesa_merchant_id:      Option<String>,
    pub mpesa_receipt:          Option<String>,
    pub buyer_phone:            Option<String>,

    pub b2c_conversation_id:    Option<String>,
    pub b2c_originator_id:      Option<String>,
    pub b2c_receipt:            Option<String>,
    pub b2c_recipient_phone:    Option<String>,

    pub tax_conversation_id:    Option<String>,
    pub tax_receipt:            Option<String>,
    pub tax_amount_cents:       Option<i64>,
    pub tax_remitted_at:        Option<DateTime<Utc>>,

    pub gross_amount_cents:     i64,
    pub fee_cents:              i64,
    pub tax_cents:              i64,
    pub net_amount_cents:       i64,

    pub stk_push_initiated_at:  Option<DateTime<Utc>>,
    pub payment_confirmed_at:   Option<DateTime<Utc>>,
    pub payout_initiated_at:    Option<DateTime<Utc>>,
    pub payout_completed_at:    Option<DateTime<Utc>>,
    pub refund_initiated_at:    Option<DateTime<Utc>>,
    pub refund_completed_at:    Option<DateTime<Utc>>,

    pub created_at:             DateTime<Utc>,
    pub updated_at:             DateTime<Utc>,
}

// ── DTOs ───────────────────────────────────────────────────────────────────────

/// Buyer initiates payment via STK push.
///
/// `buyer_phone` is optional — if omitted the server uses the
/// authenticated user's phone number from their profile.
#[derive(Debug, Deserialize, utoipa::ToSchema)]
pub struct DarajaPaymentRequest {
    /// Kenyan phone number: `07XXXXXXXX`, `+2547XXXXXXXX`, or `2547XXXXXXXX`.
    /// Normalised to `2547XXXXXXXX` internally. Omit to use profile phone.
    pub buyer_phone: Option<String>,
    /// UUID of the escrow to fund.
    pub escrow_id:   Uuid,
}

/// Returned immediately after an STK push is initiated.
#[derive(Debug, Serialize, utoipa::ToSchema)]
pub struct DarajaPaymentInitiated {
    /// UUID of the escrow being funded.
    pub escrow_id:           Uuid,
    /// Safaricom CheckoutRequestID — use to poll status if needed.
    pub checkout_request_id: String,
    /// Human-readable prompt, e.g. "Check your phone for M-Pesa prompt".
    pub message:             String,
}

/// Internal payout request — triggered by the state machine, not exposed directly.
#[derive(Debug)]
pub struct DarajaPayoutRequest {
    pub escrow_id:  Uuid,
    pub phone:      String,
    pub amount_kes: u64,
    pub is_refund:  bool,
}

/// Daraja escrow summary returned in API responses.
#[derive(Debug, Serialize, Clone, utoipa::ToSchema)]
pub struct DarajaEscrowResponse {
    /// UUID of the parent escrow transaction.
    pub escrow_id:            Uuid,
    /// Total amount charged to buyer in KES, e.g. `"5000.00"`.
    pub gross_amount:         String,
    /// Platform + Daraja fee in KES.
    pub fee_amount:           String,
    /// KRA withholding tax in KES.
    pub tax_amount:           String,
    /// Amount seller actually receives in KES.
    pub net_amount:           String,
    /// M-Pesa receipt number once payment is confirmed.
    pub mpesa_receipt:        Option<String>,
    pub payment_confirmed_at: Option<DateTime<Utc>>,
    pub payout_completed_at:  Option<DateTime<Utc>>,
    pub refund_completed_at:  Option<DateTime<Utc>>,
}

impl From<DarajaEscrowRecord> for DarajaEscrowResponse {
    fn from(r: DarajaEscrowRecord) -> Self {
        fn cents_to_kes_str(cents: i64) -> String {
            format!("{:.2}", cents as f64 / 100.0)
        }
        Self {
            escrow_id:            r.escrow_id,
            gross_amount:         cents_to_kes_str(r.gross_amount_cents),
            fee_amount:           cents_to_kes_str(r.fee_cents),
            tax_amount:           cents_to_kes_str(r.tax_cents),
            net_amount:           cents_to_kes_str(r.net_amount_cents),
            mpesa_receipt:        r.mpesa_receipt,
            payment_confirmed_at: r.payment_confirmed_at,
            payout_completed_at:  r.payout_completed_at,
            refund_completed_at:  r.refund_completed_at,
        }
    }
}

// ── Phone normalisation ────────────────────────────────────────────────────────

/// Normalise a Kenyan phone number to Daraja format: `2547XXXXXXXX`.
/// Accepts `07XXXXXXXX`, `+2547XXXXXXXX`, and `2547XXXXXXXX`.
pub fn normalise_phone(raw: &str) -> Result<String, DarajaError> {
    let digits: String = raw.chars().filter(|c| c.is_ascii_digit()).collect();
    match digits.len() {
        10 if digits.starts_with('0') => Ok(format!("254{}", &digits[1..])),
        12 if digits.starts_with("254") => Ok(digits),
        _ => Err(DarajaError::Http(format!(
            "Invalid phone number format: {}",
            raw
        ))),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_normalise_phone() {
        assert_eq!(normalise_phone("0712345678").unwrap(), "254712345678");
        assert_eq!(normalise_phone("+254712345678").unwrap(), "254712345678");
        assert_eq!(normalise_phone("254712345678").unwrap(), "254712345678");
        assert!(normalise_phone("12345").is_err());
    }
}