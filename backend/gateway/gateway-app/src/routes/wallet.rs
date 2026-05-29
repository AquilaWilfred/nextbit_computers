// ── src/handlers/wallet.rs ─────────────────────────────────────────────────────

use axum::{
    extract::{Query, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use serde::Deserialize;
use uuid::Uuid;

use crate::{
    models::wallet::{
        CardResponse, FeePreviewResponse, LoadFeePreviewResponse,
        LoadWalletRequest, PayOrderRequest, WithdrawRequest, WalletTxResponse,
    },
    services::{
        fee::{calculate_load_fee, calculate_order_fee, kes_to_cents},
        wallet as wallet_svc,
    },
    state::AppState,
};

// ── GET /api/wallet/card ───────────────────────────────────────────────────────

pub async fn get_card(
    State(app): State<AppState>,
) -> impl IntoResponse {
    let user_id = Uuid::new_v4(); // TODO: from JWT

    match wallet_svc::get_card(&app.db, user_id).await {
        Ok(card) => Json(CardResponse::from(card)).into_response(),
        Err(e)   => (StatusCode::NOT_FOUND, e.to_string()).into_response(),
    }
}

// ── POST /api/wallet/load/preview ─────────────────────────────────────────────
// Show exactly what lands in wallet before customer confirms
// "You send KES 1,000 via M-Pesa → KES 29 fee → KES 971 credited to wallet"

pub async fn preview_load_fee(
    State(_app): State<AppState>,
    Json(body):  Json<LoadWalletRequest>,
) -> impl IntoResponse {
    let amount_cents = kes_to_cents(body.amount_kes);
    let fees         = calculate_load_fee(amount_cents, &body.method);

    Json(LoadFeePreviewResponse {
        you_send_kes:      fees.gross_cents   as f64 / 100.0,
        fw_fee_kes:        fees.fw_fee_cents  as f64 / 100.0,
        wallet_credit_kes: fees.net_to_wallet as f64 / 100.0,
        method:            format!("{:?}", body.method),
    })
    .into_response()
}

// ── POST /api/wallet/load ──────────────────────────────────────────────────────
// Initiate wallet load — triggers Flutterwave STK push / checkout
// Actual credit happens in webhook handler after payment confirmed

pub async fn initiate_load(
    State(app): State<AppState>,
    Json(body): Json<LoadWalletRequest>,
) -> impl IntoResponse {
    let user_id      = Uuid::new_v4(); // TODO: from JWT
    let amount_cents = kes_to_cents(body.amount_kes);

    let card          = wallet_svc::get_card(&app.db, user_id).await;
    let is_first_load = match &card {
        Ok(c)  => c.balance_cents == 0 && c.fw_van.is_none(),
        Err(_) => true,
    };

    let minimum_cents = if is_first_load { 100_000 } else { 50_000 };
    if amount_cents < minimum_cents {
        return (
            StatusCode::BAD_REQUEST,
            format!(
                "Minimum {} load is KES {}",
                if is_first_load { "first" } else { "top-up" },
                minimum_cents / 100
            ),
        )
            .into_response();
    }

    let fees = calculate_load_fee(amount_cents, &body.method);

    // TODO: call Flutterwave STK push / checkout
    // Real credit happens when webhook fires (charge.completed)

    Json(serde_json::json!({
        "status":           "pending",
        "message":          "Payment initiated. Complete payment on your phone/browser.",
        "you_send_kes":     body.amount_kes,
        "fw_fee_kes":       fees.fw_fee_cents as f64 / 100.0,
        "wallet_credit_kes":fees.net_to_wallet as f64 / 100.0,
    }))
    .into_response()
}

// ── POST /api/wallet/pay-order ─────────────────────────────────────────────────
// Pay for an order from wallet — ALWAYS internal, ALWAYS free
// No method parameter — wallet is the only payment source for orders

pub async fn pay_order_from_wallet(
    State(app): State<AppState>,
    Json(body): Json<PayOrderRequest>,
) -> impl IntoResponse {
    let buyer_id     = Uuid::new_v4(); // TODO: from JWT
    let amount_cents = kes_to_cents(body.amount_kes);

    match wallet_svc::pay_order_from_wallet(
        &app.db,
        buyer_id,
        body.escrow_id,
        amount_cents,
    )
    .await
    {
        Ok(tx) => Json(WalletTxResponse::from(tx)).into_response(),
        Err(e) => (StatusCode::BAD_REQUEST, e.to_string()).into_response(),
    }
}

// ── GET /api/wallet/order-fee-preview ────────────────────────────────────────
// Show seller exactly what they receive after platform fee
// Buyer always pays full amount — only seller sees deduction

pub async fn preview_order_fee(
    State(app): State<AppState>,
    Json(body): Json<PayOrderRequest>,
) -> impl IntoResponse {
    let amount_cents = kes_to_cents(body.amount_kes);

    // wallet-to-wallet = no FW fee, only platform fee from seller
    match calculate_order_fee(
        &app.db,
        amount_cents,
        &crate::services::fee::PaymentMethod::Wallet,
    )
    .await
    {
        Ok(fees) => Json(FeePreviewResponse {
            gross_kes:        fees.gross_cents       as f64 / 100.0,
            fw_fee_kes:       0.0,                   // always 0 — wallet payment
            platform_fee_kes: fees.platform_fee_cents as f64 / 100.0,
            buyer_pays_kes:   fees.gross_cents        as f64 / 100.0, // buyer pays exactly what they see
            seller_gets_kes:  fees.net_to_seller      as f64 / 100.0,
        })
        .into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    }
}

// ── POST /api/wallet/withdraw ──────────────────────────────────────────────────

pub async fn withdraw(
    State(app): State<AppState>,
    Json(body): Json<WithdrawRequest>,
) -> impl IntoResponse {
    let seller_id    = Uuid::new_v4(); // TODO: from JWT
    let amount_cents = kes_to_cents(body.amount_kes);

    match wallet_svc::initiate_withdrawal(&app.db, seller_id, amount_cents).await {
        Ok(tx) => Json(WalletTxResponse::from(tx)).into_response(),
        Err(e) => (StatusCode::BAD_REQUEST, e.to_string()).into_response(),
    }
}

// ── GET /api/wallet/transactions ──────────────────────────────────────────────

#[derive(Deserialize)]
pub struct PaginationParams {
    pub limit:  Option<i64>,
    pub offset: Option<i64>,
}

pub async fn get_transactions(
    State(app):    State<AppState>,
    Query(params): Query<PaginationParams>,
) -> impl IntoResponse {
    let user_id = Uuid::new_v4(); // TODO: from JWT
    let limit   = params.limit.unwrap_or(20).min(100);
    let offset  = params.offset.unwrap_or(0);

    match wallet_svc::get_transactions(&app.db, user_id, limit, offset).await {
        Ok(txs) => {
            let response: Vec<WalletTxResponse> =
                txs.into_iter().map(WalletTxResponse::from).collect();
            Json(response).into_response()
        }
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    }
}