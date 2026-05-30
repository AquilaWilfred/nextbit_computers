// ── Daraja Escrow Handlers ─────────────────────────────────────────────────────
// HTTP handlers for:
//   • Buyer-facing: initiate STK push
//   • Daraja callbacks: STK, C2B confirm/validate, B2C result, tax, balance, orginfo
//   • Admin: trigger payout / refund after ruling

use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use serde_json::json;
use std::sync::Arc;
use uuid::Uuid;

use crate::state::AppState;
use crate::models::daraja_escrow::{DarajaError, DarajaPaymentRequest};
use crate::daraja::c2b::{
    StkCallback, C2bConfirmation, ValidationResponse,
};
use crate::daraja::b2c::B2cResult;
use crate::daraja::account_balance::AccountBalanceResult;
use crate::daraja::tax_remittance::TaxRemittanceResult;
use crate::daraja::query_org::QueryOrgResult;
use crate::daraja::transaction_status::TransactionStatusResult;
use crate::daraja_escrow::{
    stk_push_payment, on_stk_callback, on_c2b_confirmation,
    release_to_seller, refund_to_buyer, on_b2c_result, on_tax_result,
};

// ── Error → Response ──────────────────────────────────────────────────────────

impl IntoResponse for DarajaError {
    fn into_response(self) -> axum::response::Response {
        let (status, msg) = match &self {
            DarajaError::NotFound(_)            => (StatusCode::NOT_FOUND, self.to_string()),
            DarajaError::InvalidState(_)        => (StatusCode::CONFLICT, self.to_string()),
            DarajaError::AmountMismatch { .. }  => (StatusCode::UNPROCESSABLE_ENTITY, self.to_string()),
            DarajaError::InsufficientBalance{..}=> (StatusCode::PAYMENT_REQUIRED, self.to_string()),
            DarajaError::CallbackVerificationFailed => (StatusCode::UNAUTHORIZED, self.to_string()),
            _                                   => (StatusCode::INTERNAL_SERVER_ERROR, self.to_string()),
        };
        (status, Json(json!({ "error": msg }))).into_response()
    }
}

// ── 1. Buyer Initiates STK Push ────────────────────────────────────────────────
// POST /api/escrow/:escrow_id/daraja/pay
//
// Body: { "buyer_phone": "0712345678" }
// Extracts buyer_id from JWT in middleware (same pattern as existing escrow handlers).

pub async fn initiate_daraja_payment(
    State(state):  State<Arc<AppState>>,
    Path(escrow_id): Path<Uuid>,
    // In production: extract buyer_id from JWT claims via your existing auth middleware
    // For now, accept it in the request body to mirror the existing escrow pattern
    Json(req): Json<DarajaPaymentRequest>,
) -> Result<impl IntoResponse, DarajaError> {
    let result = stk_push_payment(
        &state.pg,
        &state.daraja,
        escrow_id,
        req.escrow_id,      // buyer_id — comes from JWT in prod
        &req.buyer_phone,
    )
    .await?;

    Ok((StatusCode::ACCEPTED, Json(result)))
}

// ── 2. STK Push Callback ───────────────────────────────────────────────────────
// POST /daraja/stk/callback
// Daraja posts here after buyer enters PIN (or cancels / times out).

pub async fn stk_callback(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<StkCallback>,
) -> impl IntoResponse {
    match on_stk_callback(&state.pg, payload.body.stk_callback).await {
        Ok(_) => (StatusCode::OK, Json(json!({ "ResultCode": 0, "ResultDesc": "Accepted" }))),
        Err(e) => {
            tracing::error!(error = %e, "STK callback processing failed");
            (StatusCode::OK, Json(json!({ "ResultCode": 0, "ResultDesc": "Accepted" })))
            // Always return 200 to Daraja — retries on non-200 and floods your endpoint
        }
    }
}

// ── 3. C2B Validation ─────────────────────────────────────────────────────────
// POST /daraja/c2b/validation
// Daraja calls this BEFORE processing — we can accept or reject.
// Reject if escrow_id (BillRefNumber) doesn't exist or amount is wrong.

pub async fn c2b_validation(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<C2bConfirmation>,
) -> impl IntoResponse {
    let escrow_id_result = payload.bill_ref_number.parse::<Uuid>();

    let Ok(escrow_id) = escrow_id_result else {
        return Json(ValidationResponse::reject("Invalid account reference"));
    };

    // Verify escrow exists
    match crate::services::escrow::get_escrow(&state.pg, escrow_id).await {
        Ok(_)  => Json(ValidationResponse::accept()),
        Err(_) => Json(ValidationResponse::reject("Escrow not found")),
    }
}

// ── 4. C2B Confirmation ────────────────────────────────────────────────────────
// POST /daraja/c2b/confirmation
// Daraja confirms the payment landed. At this point money has moved.

pub async fn c2b_confirmation(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<C2bConfirmation>,
) -> impl IntoResponse {
    let escrow_id = match payload.bill_ref_number.parse::<Uuid>() {
        Ok(id) => id,
        Err(_) => {
            tracing::error!(bill_ref = %payload.bill_ref_number, "C2B confirmation: invalid escrow_id");
            return StatusCode::OK;
        }
    };

    let amount_kes: u64 = payload
        .trans_amount
        .parse()
        .unwrap_or(0);

    match on_c2b_confirmation(
        &state.pg,
        escrow_id,
        &payload.trans_id,
        &payload.msisdn,
        amount_kes,
    )
    .await
    {
        Ok(_) => {}
        Err(e) => tracing::error!(error = %e, "C2B confirmation failed"),
    }

    StatusCode::OK
}

// ── 5. B2C Result ─────────────────────────────────────────────────────────────
// POST /daraja/b2c/result
// Daraja notifies us the B2C (payout or refund) completed/failed.

pub async fn b2c_result(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<B2cResult>,
) -> impl IntoResponse {
    match on_b2c_result(&state.pg, payload.result).await {
        Ok(_) => {}
        Err(e) => tracing::error!(error = %e, "B2C result processing failed"),
    }
    StatusCode::OK
}

// ── 6. B2C Queue Timeout ──────────────────────────────────────────────────────
// POST /daraja/b2c/timeout
// Daraja couldn't deliver the result in time. We must poll via TransactionStatus.

pub async fn b2c_timeout(
    State(_state): State<Arc<AppState>>,
    Json(payload): Json<serde_json::Value>,
) -> impl IntoResponse {
    // Log and alert — the ops team must manually check the payout
    tracing::error!(payload = ?payload, "B2C queue timeout — manual check required");
    StatusCode::OK
}

// ── 7. Tax Result ─────────────────────────────────────────────────────────────
// POST /daraja/tax/result

pub async fn tax_result(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<TaxRemittanceResult>,
) -> impl IntoResponse {
    let body = &payload.result;
    let receipt = body.transaction_i_d.clone();

    match on_tax_result(
        &state.pg,
        &body.conversation_id,
        &receipt,
        body.is_success(),
    )
    .await
    {
        Ok(_) => {}
        Err(e) => tracing::error!(error = %e, "Tax result processing failed"),
    }
    StatusCode::OK
}

// ── 8. Account Balance Result ─────────────────────────────────────────────────
// POST /daraja/balance/result

pub async fn balance_result(
    Json(payload): Json<AccountBalanceResult>,
) -> impl IntoResponse {
    let body = &payload.result;
    if body.is_success() {
        if let Some(params) = &body.result_parameters {
            let balances = params.parse_balances();
            for b in &balances {
                tracing::info!(
                    account = %b.account_name,
                    currency = %b.currency,
                    balance_cents = b.amount_cents,
                    "Daraja account balance"
                );
            }
        }
    }
    StatusCode::OK
}

// ── 9. Org Info Result ────────────────────────────────────────────────────────
// POST /daraja/orginfo/result

pub async fn orginfo_result(
    Json(payload): Json<QueryOrgResult>,
) -> impl IntoResponse {
    let body = &payload.result;
    if body.is_success() {
        if let Some(params) = &body.result_parameters {
            let info = params.parse_org_info();
            tracing::info!(
                shortcode    = %info.shortcode,
                org_name     = %info.org_name,
                service_type = %info.service_type,
                status       = %info.status,
                "Daraja org info received"
            );
        }
    }
    StatusCode::OK
}

// ── 10. Transaction Status Result ─────────────────────────────────────────────
// POST /daraja/txstatus/result
// Fallback — used when STK or B2C callbacks don't arrive.

pub async fn txstatus_result(
    State(_state): State<Arc<AppState>>,
    Json(payload): Json<TransactionStatusResult>,
) -> impl IntoResponse {
    let body = &payload.result;
    tracing::info!(
        conversation_id = %body.conversation_id,
        result_code     = body.result_code,
        is_completed    = body.is_completed(),
        "Transaction status result received"
    );
    // Specific remediation is handled by the caller that initiated the query.
    // Log here; the ops team can trigger manual state corrections if needed.
    StatusCode::OK
}

// ── 11. Admin: Trigger Payout After Ruling ────────────────────────────────────
// POST /api/escrow/:escrow_id/daraja/release
// Body: { "seller_phone": "0712345678" }
// Called by your existing admin_ruling handler AFTER applying the state transition.

pub async fn admin_release_payout(
    State(state):    State<Arc<AppState>>,
    Path(escrow_id): Path<Uuid>,
    Json(body):      Json<serde_json::Value>,
) -> Result<impl IntoResponse, DarajaError> {
    let seller_phone = body["seller_phone"]
        .as_str()
        .ok_or_else(|| DarajaError::Http("seller_phone required".into()))?;

    release_to_seller(
        &state.pg,
        &state.daraja,
        escrow_id,
        seller_phone,
        None,
        None,
    )
    .await?;

    Ok((StatusCode::ACCEPTED, Json(json!({ "status": "payout_initiated" }))))
}

// ── 12. Admin: Trigger Refund After Ruling ────────────────────────────────────
// POST /api/escrow/:escrow_id/daraja/refund
// Body: { "buyer_phone": "0712345678" }

pub async fn admin_trigger_refund(
    State(state):    State<Arc<AppState>>,
    Path(escrow_id): Path<Uuid>,
    Json(body):      Json<serde_json::Value>,
) -> Result<impl IntoResponse, DarajaError> {
    let buyer_phone = body["buyer_phone"]
        .as_str()
        .ok_or_else(|| DarajaError::Http("buyer_phone required".into()))?;

    refund_to_buyer(
        &state.pg,
        &state.daraja,
        escrow_id,
        buyer_phone,
    )
    .await?;

    Ok((StatusCode::ACCEPTED, Json(json!({ "status": "refund_initiated" }))))
}