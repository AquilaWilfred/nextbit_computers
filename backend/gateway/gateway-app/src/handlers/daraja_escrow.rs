// ── Daraja Escrow Handlers ─────────────────────────────────────────────────────
// HTTP handlers for:
//   • Buyer-facing: initiate STK push
//   • Daraja callbacks: STK, C2B confirm/validate, B2C result, tax, balance, orginfo
//   • Admin: trigger payout / refund after ruling

use axum::{
    extract::{Path, State, Extension},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::sync::Arc;
use uuid::Uuid;

use crate::state::AppState;
use crate::models::daraja_escrow::{DarajaError, DarajaPaymentRequest};
use crate::models::Claims;
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

// ── Inline request / response schemas (for Scalar docs) ───────────────────────

/// Response after a successful STK push initiation.
#[derive(Serialize, utoipa::ToSchema)]
pub struct StkPushResponse {
    /// Safaricom merchant request ID
    pub merchant_request_id: String,
    /// Safaricom checkout request ID
    pub checkout_request_id: String,
    /// Human-readable description
    pub customer_message: String,
}

/// Response body returned to the admin after triggering a payout.
#[derive(Serialize, utoipa::ToSchema)]
pub struct PayoutStatusResponse {
    pub status: String,
}

/// Response body returned to the admin after triggering a refund.
#[derive(Serialize, utoipa::ToSchema)]
pub struct RefundStatusResponse {
    pub status: String,
}

/// Generic error body.
#[derive(Serialize, utoipa::ToSchema)]
pub struct ErrorResponse {
    pub error: String,
}

/// Admin payout request body.
#[derive(Deserialize, utoipa::ToSchema)]
pub struct AdminReleaseRequest {
    /// Seller's Safaricom phone number in the format 0712345678 or 254712345678
    pub seller_phone: String,
}

/// Admin refund request body.
#[derive(Deserialize, utoipa::ToSchema)]
pub struct AdminRefundRequest {
    /// Buyer's Safaricom phone number in the format 0712345678 or 254712345678
    pub buyer_phone: String,
}

// ── Error → Response ──────────────────────────────────────────────────────────

impl IntoResponse for DarajaError {
    fn into_response(self) -> axum::response::Response {
        let (status, msg) = match &self {
            DarajaError::NotFound(_)             => (StatusCode::NOT_FOUND, self.to_string()),
            DarajaError::InvalidState(_)         => (StatusCode::CONFLICT, self.to_string()),
            DarajaError::AmountMismatch { .. }   => (StatusCode::UNPROCESSABLE_ENTITY, self.to_string()),
            DarajaError::InsufficientBalance{..} => (StatusCode::PAYMENT_REQUIRED, self.to_string()),
            DarajaError::CallbackVerificationFailed => (StatusCode::UNAUTHORIZED, self.to_string()),
            _                                    => (StatusCode::INTERNAL_SERVER_ERROR, self.to_string()),
        };
        (status, Json(json!({ "error": msg }))).into_response()
    }
}

// ── 1. Buyer Initiates STK Push ────────────────────────────────────────────────

/// Initiate an M-Pesa STK push for the given escrow.
///
/// Sends a payment prompt to the buyer's phone. The buyer enters their
/// M-Pesa PIN and the result is delivered asynchronously via the STK
/// callback (`POST /daraja/stk/callback`).
///
/// `buyer_phone` is optional — if omitted the phone stored in the
/// authenticated user's profile is used.
#[utoipa::path(
    post,
    path = "/api/escrow/{escrow_id}/daraja/pay",
    tag = "Escrow · Daraja",
    params(
        ("escrow_id" = Uuid, Path, description = "UUID of the escrow to fund")
    ),
    request_body(
        content = DarajaPaymentRequest,
        description = "Optional buyer phone override",
        content_type = "application/json"
    ),
    responses(
        (status = 202, description = "STK push accepted by Safaricom",          body = StkPushResponse),
        (status = 404, description = "Escrow not found",                         body = ErrorResponse),
        (status = 409, description = "Escrow is in the wrong state for payment", body = ErrorResponse),
        (status = 422, description = "Amount mismatch",                          body = ErrorResponse),
        (status = 500, description = "Internal / Daraja API error",              body = ErrorResponse),
    ),
    security(("bearerAuth" = []))
)]
pub async fn initiate_daraja_payment(
    State(state):      State<Arc<AppState>>,
    Extension(claims): Extension<Claims>,
    Path(escrow_id):   Path<Uuid>,
    Json(req):         Json<DarajaPaymentRequest>,
) -> Result<impl IntoResponse, DarajaError> {
    let buyer_id = match crate::services::escrow::get_user_id_by_email(&state.pg, &claims.sub).await {
        Ok(id) => id,
        Err(e) => return Err(DarajaError::Http(e.to_string())),
    };

    let buyer_phone = match req.buyer_phone {
        Some(p) => p,
        None => match crate::services::escrow::get_user_phone_by_id(&state.pg, buyer_id).await {
            Ok(p) => p,
            Err(e) => return Err(DarajaError::Http(e.to_string())),
        },
    };

    let result = stk_push_payment(
        &state.pg,
        &state.daraja,
        escrow_id,
        buyer_id,
        &buyer_phone,
    )
    .await?;

    Ok((StatusCode::ACCEPTED, Json(result)))
}

// ── 2. STK Push Callback ───────────────────────────────────────────────────────

/// Receive the STK push result from Safaricom.
///
/// Daraja posts here after the buyer enters their PIN (or cancels /
/// the request times out). Always returns `200 OK` — non-200 causes
/// Safaricom to retry and flood the endpoint.
#[utoipa::path(
    post,
    path = "/daraja/stk/callback",
    tag = "Escrow · Daraja · Callbacks",
    request_body(
        content = StkCallback,
        description = "Safaricom STK push result payload",
        content_type = "application/json"
    ),
    responses(
        (status = 200, description = "Acknowledged — always returned regardless of internal errors"),
    )
)]
pub async fn stk_callback(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<StkCallback>,
) -> impl IntoResponse {
    match on_stk_callback(&state.pg, payload.body.stk_callback).await {
        Ok(_) => (StatusCode::OK, Json(json!({ "ResultCode": 0, "ResultDesc": "Accepted" }))),
        Err(e) => {
            tracing::error!(error = %e, "STK callback processing failed");
            (StatusCode::OK, Json(json!({ "ResultCode": 0, "ResultDesc": "Accepted" })))
        }
    }
}

// ── 3. C2B Validation ─────────────────────────────────────────────────────────

/// Validate a C2B payment before Safaricom processes it.
///
/// Safaricom calls this endpoint before debiting the customer.
/// Reject if `BillRefNumber` is not a valid escrow UUID or the
/// escrow does not exist — Safaricom will abort the transaction.
#[utoipa::path(
    post,
    path = "/daraja/c2b/validation",
    tag = "Escrow · Daraja · Callbacks",
    request_body(
        content = C2bConfirmation,
        description = "Safaricom C2B validation payload",
        content_type = "application/json"
    ),
    responses(
        (status = 200, description = "Accept or reject decision returned in body (Safaricom format)"),
    )
)]
pub async fn c2b_validation(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<C2bConfirmation>,
) -> impl IntoResponse {
    let escrow_id_result = payload.bill_ref_number.parse::<Uuid>();

    let Ok(escrow_id) = escrow_id_result else {
        return Json(ValidationResponse::reject("Invalid account reference"));
    };

    match crate::services::escrow::get_escrow(&state.pg, escrow_id).await {
        Ok(_)  => Json(ValidationResponse::accept()),
        Err(_) => Json(ValidationResponse::reject("Escrow not found")),
    }
}

// ── 4. C2B Confirmation ────────────────────────────────────────────────────────

/// Confirm a completed C2B payment from Safaricom.
///
/// Called after the money has moved. The escrow is advanced to
/// `funded` state and the M-Pesa transaction ID is recorded.
/// Always returns `200 OK`.
#[utoipa::path(
    post,
    path = "/daraja/c2b/confirmation",
    tag = "Escrow · Daraja · Callbacks",
    request_body(
        content = C2bConfirmation,
        description = "Safaricom C2B confirmation payload",
        content_type = "application/json"
    ),
    responses(
        (status = 200, description = "Acknowledged"),
    )
)]
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

    let amount_kes: u64 = payload.trans_amount.parse().unwrap_or(0);

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

/// Receive the B2C (payout or refund) result from Safaricom.
///
/// Daraja posts here once the business-to-customer disbursement
/// completes or fails. The escrow is transitioned to `released` or
/// `refunded` accordingly.
#[utoipa::path(
    post,
    path = "/daraja/b2c/result",
    tag = "Escrow · Daraja · Callbacks",
    request_body(
        content = B2cResult,
        description = "Safaricom B2C result payload",
        content_type = "application/json"
    ),
    responses(
        (status = 200, description = "Acknowledged"),
    )
)]
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

/// Handle a B2C queue timeout from Safaricom.
///
/// Safaricom was unable to deliver the B2C result within the timeout
/// window. The ops team must manually verify the payout via the
/// Transaction Status API. Always returns `200 OK`.
#[utoipa::path(
    post,
    path = "/daraja/b2c/timeout",
    tag = "Escrow · Daraja · Callbacks",
    request_body(
        content = inline(serde_json::Value),
        description = "Safaricom B2C timeout payload (schema varies)",
        content_type = "application/json"
    ),
    responses(
        (status = 200, description = "Acknowledged — ops team must manually verify payout"),
    )
)]
pub async fn b2c_timeout(
    State(_state): State<Arc<AppState>>,
    Json(payload): Json<serde_json::Value>,
) -> impl IntoResponse {
    tracing::error!(payload = ?payload, "B2C queue timeout — manual check required");
    StatusCode::OK
}

// ── 7. Tax Result ─────────────────────────────────────────────────────────────

/// Receive the tax remittance result from Safaricom.
///
/// Records whether the KRA tax remittance for the escrow succeeded
/// and stores the M-Pesa receipt number.
#[utoipa::path(
    post,
    path = "/daraja/tax/result",
    tag = "Escrow · Daraja · Callbacks",
    request_body(
        content = TaxRemittanceResult,
        description = "Safaricom tax remittance result payload",
        content_type = "application/json"
    ),
    responses(
        (status = 200, description = "Acknowledged"),
    )
)]
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

/// Receive the account balance query result from Safaricom.
///
/// Logs each account's available and current balance in KES.
/// Used to verify the paybill wallet before initiating large B2C payouts.
#[utoipa::path(
    post,
    path = "/daraja/balance/result",
    tag = "Escrow · Daraja · Callbacks",
    request_body(
        content = AccountBalanceResult,
        description = "Safaricom account balance result payload",
        content_type = "application/json"
    ),
    responses(
        (status = 200, description = "Acknowledged — balances written to application logs"),
    )
)]
pub async fn balance_result(
    Json(payload): Json<AccountBalanceResult>,
) -> impl IntoResponse {
    let body = &payload.result;
    if body.is_success() {
        if let Some(params) = &body.result_parameters {
            let balances = params.parse_balances();
            for b in &balances {
                tracing::info!(
                    account  = %b.account_name,
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

/// Receive the organisation info query result from Safaricom.
///
/// Logs shortcode, organisation name, service type and registration
/// status. Useful for confirming paybill configuration in staging and
/// production environments.
#[utoipa::path(
    post,
    path = "/daraja/orginfo/result",
    tag = "Escrow · Daraja · Callbacks",
    request_body(
        content = QueryOrgResult,
        description = "Safaricom org info result payload",
        content_type = "application/json"
    ),
    responses(
        (status = 200, description = "Acknowledged — org info written to application logs"),
    )
)]
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

/// Receive a transaction status query result from Safaricom.
///
/// Used as a fallback when STK or B2C callbacks do not arrive within
/// the expected window. Logs the result for the ops team; manual state
/// corrections can be applied if needed.
#[utoipa::path(
    post,
    path = "/daraja/txstatus/result",
    tag = "Escrow · Daraja · Callbacks",
    request_body(
        content = TransactionStatusResult,
        description = "Safaricom transaction status result payload",
        content_type = "application/json"
    ),
    responses(
        (status = 200, description = "Acknowledged — result written to application logs"),
    )
)]
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
    StatusCode::OK
}

// ── 11. Admin: Trigger Payout After Ruling ────────────────────────────────────

/// Release escrowed funds to the seller after a dispute ruling.
///
/// Must be called **after** the admin ruling handler has already
/// applied the escrow state transition to `approved`. Initiates a B2C
/// payment to the seller; the final result arrives via
/// `POST /daraja/b2c/result`.
#[utoipa::path(
    post,
    path = "/api/escrow/{escrow_id}/daraja/release",
    tag = "Escrow · Daraja",
    params(
        ("escrow_id" = Uuid, Path, description = "UUID of the escrow to release")
    ),
    request_body(
        content = AdminReleaseRequest,
        description = "Seller phone number for B2C payout",
        content_type = "application/json"
    ),
    responses(
        (status = 202, description = "Payout initiated",                              body = PayoutStatusResponse),
        (status = 404, description = "Escrow not found",                              body = ErrorResponse),
        (status = 409, description = "Escrow is not in a releasable state",           body = ErrorResponse),
        (status = 402, description = "Paybill wallet has insufficient balance",       body = ErrorResponse),
        (status = 500, description = "Internal / Daraja API error",                   body = ErrorResponse),
    ),
    security(("bearerAuth" = []))
)]
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

/// Refund escrowed funds to the buyer after a dispute ruling.
///
/// Must be called **after** the admin ruling handler has already
/// applied the escrow state transition to `refund_approved`. Initiates
/// a B2C payment back to the buyer; the final result arrives via
/// `POST /daraja/b2c/result`.
#[utoipa::path(
    post,
    path = "/api/escrow/{escrow_id}/daraja/refund",
    tag = "Escrow · Daraja",
    params(
        ("escrow_id" = Uuid, Path, description = "UUID of the escrow to refund")
    ),
    request_body(
        content = AdminRefundRequest,
        description = "Buyer phone number for B2C refund",
        content_type = "application/json"
    ),
    responses(
        (status = 202, description = "Refund initiated",                              body = RefundStatusResponse),
        (status = 404, description = "Escrow not found",                              body = ErrorResponse),
        (status = 409, description = "Escrow is not in a refundable state",           body = ErrorResponse),
        (status = 402, description = "Paybill wallet has insufficient balance",       body = ErrorResponse),
        (status = 500, description = "Internal / Daraja API error",                   body = ErrorResponse),
    ),
    security(("bearerAuth" = []))
)]
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