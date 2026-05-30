// ── MyWallet Handlers ──────────────────────────────────────────────────────────
// HTTP handlers for the Daraja-backed wallet.
// Routes are registered under /api/mywallet/...

use axum::{
    extract::State,
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use serde_json::json;
use std::sync::Arc;
use uuid::Uuid;

use crate::state::AppState;
use crate::models::daraja_escrow::DarajaError;
use crate::daraja::c2b::StkCallback;
use crate::daraja::b2c::B2cResult;
use crate::services::mywallet::{
    get_or_create_card, get_wallet_balance,
    initiate_wallet_load, on_wallet_load_stk_callback,
    initiate_wallet_withdrawal, on_withdrawal_result,
    LoadWalletRequest, WithdrawRequest,
};

// ── GET /api/mywallet ──────────────────────────────────────────────────────────
// Returns wallet card + balance.
// user_id from JWT — replace Uuid::nil() with your JWT extractor.

pub async fn get_my_wallet(
    State(state): State<Arc<AppState>>,
    // TODO: replace with your JWT extractor: Extension(claims): Extension<Claims>
) -> Result<impl IntoResponse, DarajaError> {
    // Placeholder — swap with actual user_id from JWT
    let user_id = Uuid::nil();

    let balance = get_wallet_balance(&state.pg, user_id).await?;
    Ok((StatusCode::OK, Json(balance)))
}

// ── POST /api/mywallet/load ────────────────────────────────────────────────────
// Initiate M-Pesa top-up via STK push.
// Body: { "phone": "0712345678", "amount_kes": 500 }

pub async fn load_wallet(
    State(state): State<Arc<AppState>>,
    Json(req):    Json<LoadWalletRequest>,
) -> Result<impl IntoResponse, DarajaError> {
    // Placeholder — replace with JWT user_id
    let user_id = Uuid::nil();

    let result = initiate_wallet_load(
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
// Withdraw from wallet balance to M-Pesa via B2C.
// Body: { "phone": "0712345678", "amount_kes": 200 }

pub async fn withdraw_from_wallet(
    State(state): State<Arc<AppState>>,
    Json(req):    Json<WithdrawRequest>,
) -> Result<impl IntoResponse, DarajaError> {
    let user_id = Uuid::nil();

    let conversation_id = initiate_wallet_withdrawal(
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

// ── POST /daraja/mywallet/stk/callback ────────────────────────────────────────
// Daraja posts here after wallet top-up STK.
// Separate from escrow STK callback — different account_reference prefix ("load-")

pub async fn wallet_stk_callback(
    State(state):  State<AppState>,
    Json(payload): Json<StkCallback>,
) -> impl IntoResponse {
    let cb = &payload.body.stk_callback;
    let checkout_id = &cb.checkout_request_id;

    // Only handle "load-" prefixed references (wallet top-ups)
    // Escrow STK callbacks are handled by daraja_escrow::stk_callback
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
        Ok(_) => {}
        Err(e) => tracing::error!(error = %e, "Wallet STK callback failed"),
    }

    // Always 200 to Daraja
    (StatusCode::OK, Json(json!({ "ResultCode": 0, "ResultDesc": "Accepted" })))
}

// ── POST /daraja/mywallet/b2c/result ─────────────────────────────────────────
// Daraja posts here after wallet withdrawal B2C completes.

pub async fn wallet_b2c_result(
    State(state):  State<AppState>,
    Json(payload): Json<B2cResult>,
) -> impl IntoResponse {
    match on_withdrawal_result(&state.pg, payload.result).await {
        Ok(_) => {}
        Err(e) => tracing::error!(error = %e, "Wallet B2C result failed"),
    }
    StatusCode::OK
}