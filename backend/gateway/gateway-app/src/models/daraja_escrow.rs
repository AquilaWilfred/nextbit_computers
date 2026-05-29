// ── Daraja Escrow Models ───────────────────────────────────────────────────────
// Extends the existing escrow model with Daraja-specific fields and error types.
// The existing EscrowState, EscrowAction, EscrowTransaction remain unchanged.

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

// ── Error Type ─────────────────────────────────────────────────────────────────
// Mirrors EscrowError but covers Daraja API failures and payment mismatches.

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
    pub escrow_id:              Uuid,   // FK → escrow_transactions.id

    // C2B / STK Push fields
    pub mpesa_checkout_id:      Option<String>,  // CheckoutRequestID from STK push
    pub mpesa_merchant_id:      Option<String>,  // MerchantRequestID
    pub mpesa_receipt:          Option<String>,  // Mpesa receipt e.g. OFI2XXXXXXX
    pub buyer_phone:            Option<String>,  // 2547XXXXXXXX

    // B2C payout fields (seller release or buyer refund)
    pub b2c_conversation_id:    Option<String>,
    pub b2c_originator_id:      Option<String>,
    pub b2c_receipt:            Option<String>,
    pub b2c_recipient_phone:    Option<String>,

    // Tax remittance
    pub tax_conversation_id:    Option<String>,
    pub tax_receipt:            Option<String>,
    pub tax_amount_cents:       Option<i64>,
    pub tax_remitted_at:        Option<DateTime<Utc>>,

    // Amounts (cents = KES * 100)
    pub gross_amount_cents:     i64,
    pub fee_cents:              i64,
    pub tax_cents:              i64,
    pub net_amount_cents:       i64,    // what seller actually receives

    // Status tracking
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

/// Buyer initiates payment via STK push
#[derive(Debug, Deserialize)]
pub struct DarajaPaymentRequest {
    pub buyer_phone:  String,     // 07XXXXXXXX or 2547XXXXXXXX — normalised internally
    pub escrow_id:    Uuid,
}

/// Response after STK push initiated
#[derive(Debug, Serialize)]
pub struct DarajaPaymentInitiated {
    pub escrow_id:          Uuid,
    pub checkout_request_id: String,
    pub message:            String,    // "Check your phone for M-Pesa prompt"
}

/// Payout request (internal — triggered by state machine)
#[derive(Debug)]
pub struct DarajaPayoutRequest {
    pub escrow_id:    Uuid,
    pub phone:        String,
    pub amount_kes:   u64,
    pub is_refund:    bool,    // true = refund to buyer, false = payout to seller
}

/// Daraja escrow summary for API responses
#[derive(Debug, Serialize, Clone)]
pub struct DarajaEscrowResponse {
    pub escrow_id:          Uuid,
    pub gross_amount:       String,     // KES string, e.g. "5000.00"
    pub fee_amount:         String,
    pub tax_amount:         String,
    pub net_amount:         String,
    pub mpesa_receipt:      Option<String>,
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

/// Normalise Kenyan phone to Daraja format: 2547XXXXXXXX
/// Accepts: 07XXXXXXXX, +2547XXXXXXXX, 2547XXXXXXXX
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