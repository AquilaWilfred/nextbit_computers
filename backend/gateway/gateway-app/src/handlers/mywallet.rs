// ── MyWallet Handlers ──────────────────────────────────────────────────────────
// HTTP handlers for the Daraja-backed wallet.
// Routes are registered under /api/mywallet/...

use axum::{
    extract::{Query, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use serde::Deserialize;
use serde_json::json;
use std::sync::Arc;
use uuid::Uuid;

use crate::state::AppState;
use crate::models::daraja_escrow::DarajaError;
use crate::daraja::c2b::StkCallback;
use crate::daraja::b2c::B2cResult;
use crate::mywallet::{
    get_wallet_balance,
    initiate_wallet_load, on_wallet_load_stk_callback,
    initiate_wallet_withdrawal, on_withdrawal_result,
    pay_order_from_wallet, credit_seller_payout, get_transactions,
    LoadWalletRequest, WithdrawRequest,
};

// ── GET /api/mywallet ──────────────────────────────────────────────────────────

/// Get the authenticated user's wallet card and current balance.
#[utoipa::path(
    get,
    path = "/api/mywallet",
    responses(
        (status = 200, description = "Wallet card and balance"),
        (status = 401, description = "Unauthorized"),
        (status = 500, description = "Internal server error"),
    ),
    security(("bearer_auth" = [])),
    tag = "MyWallet"
)]
pub async fn get_my_wallet(
    State(state): State<Arc<AppState>>,
) -> Result<impl IntoResponse, DarajaError> {
    let user_id = Uuid::nil(); // TODO: from JWT

    let balance: crate::mywallet::WalletCardResponse =
        get_wallet_balance(&state.pg, user_id).await?;
    Ok((StatusCode::OK, Json(balance)))
}

// ── POST /api/mywallet/load ────────────────────────────────────────────────────

/// Initiate an M-Pesa STK push to top up the wallet.
#[utoipa::path(
    post,
    path = "/api/mywallet/load",
    request_body = LoadWalletRequest,
    responses(
        (status = 202, description = "STK push initiated"),
        (status = 400, description = "Bad request"),
        (status = 401, description = "Unauthorized"),
        (status = 500, description = "Internal server error"),
    ),
    security(("bearer_auth" = [])),
    tag = "MyWallet"
)]
pub async fn load_wallet(
    State(state): State<Arc<AppState>>,
    Json(req):    Json<LoadWalletRequest>,
) -> Result<impl IntoResponse, DarajaError> {
    let user_id = Uuid::nil(); // TODO: from JWT

    let result: crate::mywallet::LoadWalletInitiated = initiate_wallet_load(
        &state.pg,
        &state.daraja,
        user_id,
        &req.phone,
        req.amount_kes,
    )
    .await?;

    Ok((StatusCode::ACCEPTED, Json(result)))
}

// ── POST /api/mywallet/withdraw ────────────────────────────────────────────────

/// Withdraw from wallet balance to M-Pesa via B2C.
#[utoipa::path(
    post,
    path = "/api/mywallet/withdraw",
    request_body = WithdrawRequest,
    responses(
        (status = 202, description = "Withdrawal initiated",
            body = inline(serde_json::Value),
            example = json!({ "status": "withdrawal_initiated", "conversation_id": "AG_..." })
        ),
        (status = 400, description = "Insufficient balance or bad request"),
        (status = 401, description = "Unauthorized"),
        (status = 500, description = "Internal server error"),
    ),
    security(("bearer_auth" = [])),
    tag = "MyWallet"
)]
pub async fn withdraw_from_wallet(
    State(state): State<Arc<AppState>>,
    Json(req):    Json<WithdrawRequest>,
) -> Result<impl IntoResponse, DarajaError> {
    let user_id = Uuid::nil(); // TODO: from JWT

    let conversation_id: String = initiate_wallet_withdrawal(
        &state.pg,
        &state.daraja,
        user_id,
        &req.phone,
        req.amount_kes,
    )
    .await?;

    Ok((StatusCode::ACCEPTED, Json(json!({
        "status": "withdrawal_initiated",
        "conversation_id": conversation_id
    }))))
}

// ── POST /api/mywallet/pay-order ──────────────────────────────────────────────

#[derive(Deserialize)]
pub struct PayOrderRequest {
    pub escrow_id:  Uuid,
    pub amount_kes: f64,
}

/// Pay for an escrow order directly from wallet balance.
/// Always internal and fee-free — no M-Pesa involved.
#[utoipa::path(
    post,
    path = "/api/mywallet/pay-order",
    request_body = inline(serde_json::Value),
    responses(
        (status = 200, description = "Order paid from wallet",
            body = inline(serde_json::Value),
            example = json!({ "status": "completed", "amount_kes": 500.0 })
        ),
        (status = 400, description = "Insufficient balance or bad request"),
        (status = 401, description = "Unauthorized"),
    ),
    security(("bearer_auth" = [])),
    tag = "MyWallet"
)]
pub async fn pay_order(
    State(state): State<Arc<AppState>>,
    Json(req):    Json<PayOrderRequest>,
) -> Result<impl IntoResponse, DarajaError> {
    let buyer_id     = Uuid::nil(); // TODO: from JWT
    let amount_cents = (req.amount_kes * 100.0) as i64;

    let tx = pay_order_from_wallet(&state.pg, buyer_id, req.escrow_id, amount_cents).await?;
    Ok((StatusCode::OK, Json(tx)))
}

// ── POST /api/mywallet/payout ─────────────────────────────────────────────────

#[derive(Deserialize)]
pub struct SellerPayoutRequest {
    pub seller_id:          Uuid,
    pub escrow_id:          Uuid,
    pub gross_kes:          f64,
    pub platform_fee_kes:   f64,
}

/// Credit seller wallet after escrow release.
/// Called internally by the escrow service — not directly by users.
#[utoipa::path(
    post,
    path = "/api/mywallet/payout",
    request_body = inline(serde_json::Value),
    responses(
        (status = 200, description = "Seller payout credited",
            body = inline(serde_json::Value),
            example = json!({ "status": "completed", "net_kes": 485.0 })
        ),
        (status = 400, description = "Bad request"),
        (status = 401, description = "Unauthorized"),
    ),
    security(("bearer_auth" = [])),
    tag = "MyWallet"
)]
pub async fn payout_seller(
    State(state): State<Arc<AppState>>,
    Json(req):    Json<SellerPayoutRequest>,
) -> Result<impl IntoResponse, DarajaError> {
    let gross_cents        = (req.gross_kes        * 100.0) as i64;
    let platform_fee_cents = (req.platform_fee_kes * 100.0) as i64;

    let tx = credit_seller_payout(
        &state.pg,
        req.seller_id,
        req.escrow_id,
        gross_cents,
        platform_fee_cents,
    )
    .await?;

    Ok((StatusCode::OK, Json(tx)))
}

// ── GET /api/mywallet/transactions ────────────────────────────────────────────

#[derive(Deserialize, utoipa::IntoParams)]
pub struct PaginationParams {
    /// Max records to return (default 20, max 100)
    pub limit:  Option<i64>,
    /// Records to skip (default 0)
    pub offset: Option<i64>,
}

/// List wallet transactions for the authenticated user, paginated.
#[utoipa::path(
    get,
    path = "/api/mywallet/transactions",
    params(PaginationParams),
    responses(
        (status = 200, description = "Transaction list"),
        (status = 401, description = "Unauthorized"),
        (status = 500, description = "Internal server error"),
    ),
    security(("bearer_auth" = [])),
    tag = "MyWallet"
)]
pub async fn get_wallet_transactions(
    State(state):  State<Arc<AppState>>,
    Query(params): Query<PaginationParams>,
) -> Result<impl IntoResponse, DarajaError> {
    let user_id = Uuid::nil(); // TODO: from JWT
    let limit   = params.limit.unwrap_or(20).min(100);
    let offset  = params.offset.unwrap_or(0);

    let txs = get_transactions(&state.pg, user_id, limit, offset).await?;
    Ok((StatusCode::OK, Json(txs)))
}

// ── POST /daraja/mywallet/stk/callback ────────────────────────────────────────

/// Daraja STK push callback for wallet top-ups.
/// Public route — called by Safaricom, no auth required.
#[utoipa::path(
    post,
    path = "/daraja/mywallet/stk/callback",
    request_body = StkCallback,
    responses(
        (status = 200, description = "Callback accepted",
            body = inline(serde_json::Value),
            example = json!({ "ResultCode": 0, "ResultDesc": "Accepted" })
        ),
    ),
    tag = "Webhooks"
)]
pub async fn wallet_stk_callback(
    State(state):  State<AppState>,
    Json(payload): Json<StkCallback>,
) -> impl IntoResponse {
    let cb          = &payload.body.stk_callback;
    let checkout_id = &cb.checkout_request_id;

    let amount_cents = cb
        .callback_metadata
        .as_ref()
        .and_then(|m| m.amount())
        .map(|a| (a * 100) as i64)
        .unwrap_or(0);

    let receipt = cb
        .callback_metadata
        .as_ref()
        .and_then(|m| m.mpesa_receipt());

    match on_wallet_load_stk_callback(
        &state.pg,
        checkout_id,
        cb.result_code,
        amount_cents,
        receipt.as_deref(),
    )
    .await
    {
        Ok(_)  => {}
        Err(e) => tracing::error!(error = %e, "Wallet STK callback failed"),
    }

    (StatusCode::OK, Json(json!({ "ResultCode": 0, "ResultDesc": "Accepted" })))
}

// ── POST /daraja/mywallet/b2c/result ─────────────────────────────────────────

/// Daraja B2C result callback for wallet withdrawals.
/// Public route — called by Safaricom, no auth required.
#[utoipa::path(
    post,
    path = "/daraja/mywallet/b2c/result",
    request_body = B2cResult,
    responses(
        (status = 200, description = "B2C result accepted"),
    ),
    tag = "Webhooks"
)]
pub async fn wallet_b2c_result(
    State(state):  State<AppState>,
    Json(payload): Json<B2cResult>,
) -> impl IntoResponse {
    match on_withdrawal_result(&state.pg, payload.result).await {
        Ok(_)  => {}
        Err(e) => tracing::error!(error = %e, "Wallet B2C result failed"),
    }
    StatusCode::OK
}