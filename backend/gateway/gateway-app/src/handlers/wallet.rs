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

/// Get the authenticated user's wallet card details.
#[utoipa::path(
    get,
    path = "/api/wallet/card",
    responses(
        (status = 200, description = "Wallet card details",   body = CardResponse),
        (status = 401, description = "Unauthorized"),
        (status = 404, description = "Card not found"),
    ),
    security(("bearer_auth" = [])),
    tag = "Wallet"
)]
pub async fn get_card(
    State(app): State<AppState>,
) -> impl IntoResponse {
    let user_id = Uuid::new_v4(); // TODO: from JWT

    match wallet_svc::get_card(&app.pg, user_id).await {
        Ok(card) => Json(CardResponse::from(card)).into_response(),
        Err(e)   => (StatusCode::NOT_FOUND, e.to_string()).into_response(),
    }
}

// ── POST /api/wallet/load/preview ─────────────────────────────────────────────

/// Preview the fee breakdown before loading the wallet.
#[utoipa::path(
    post,
    path = "/api/wallet/load/preview",
    request_body = LoadWalletRequest,
    responses(
        (status = 200, description = "Fee preview calculated", body = LoadFeePreviewResponse),
        (status = 400, description = "Bad request"),
    ),
    security(("bearer_auth" = [])),
    tag = "Wallet"
)]
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

/// Initiate a wallet top-up. Actual credit happens after webhook confirmation.
#[utoipa::path(
    post,
    path = "/api/wallet/load",
    request_body = LoadWalletRequest,
    responses(
        (status = 200, description = "Payment initiated",
            body = inline(serde_json::Value),
            example = json!({
                "status": "pending",
                "message": "Payment initiated. Complete payment on your phone/browser.",
                "you_send_kes": 1000.0,
                "fw_fee_kes": 29.0,
                "wallet_credit_kes": 971.0
            })
        ),
        (status = 400, description = "Amount below minimum"),
        (status = 401, description = "Unauthorized"),
    ),
    security(("bearer_auth" = [])),
    tag = "Wallet"
)]
pub async fn initiate_load(
    State(app): State<AppState>,
    Json(body): Json<LoadWalletRequest>,
) -> impl IntoResponse {
    let user_id      = Uuid::new_v4(); // TODO: from JWT
    let amount_cents = kes_to_cents(body.amount_kes);

    let card          = wallet_svc::get_card(&app.pg, user_id).await;
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

    Json(serde_json::json!({
        "status":            "pending",
        "message":           "Payment initiated. Complete payment on your phone/browser.",
        "you_send_kes":      body.amount_kes,
        "fw_fee_kes":        fees.fw_fee_cents as f64 / 100.0,
        "wallet_credit_kes": fees.net_to_wallet as f64 / 100.0,
    }))
    .into_response()
}

// ── POST /api/wallet/pay-order ─────────────────────────────────────────────────

/// Pay for an order directly from wallet balance. Always internal and fee-free.
#[utoipa::path(
    post,
    path = "/api/wallet/pay-order",
    request_body = PayOrderRequest,
    responses(
        (status = 200, description = "Order paid from wallet", body = WalletTxResponse),
        (status = 400, description = "Insufficient balance or bad request"),
        (status = 401, description = "Unauthorized"),
    ),
    security(("bearer_auth" = [])),
    tag = "Wallet"
)]
pub async fn pay_order_from_wallet(
    State(app): State<AppState>,
    Json(body): Json<PayOrderRequest>,
) -> impl IntoResponse {
    let buyer_id     = Uuid::new_v4(); // TODO: from JWT
    let amount_cents = kes_to_cents(body.amount_kes);

    match wallet_svc::pay_order_from_wallet(
        &app.pg,
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

/// Preview the platform fee breakdown for a wallet order payment.
#[utoipa::path(
    get,
    path = "/api/wallet/order-fee-preview",
    request_body = PayOrderRequest,
    responses(
        (status = 200, description = "Order fee preview",      body = FeePreviewResponse),
        (status = 500, description = "Internal server error"),
    ),
    security(("bearer_auth" = [])),
    tag = "Wallet"
)]
pub async fn preview_order_fee(
    State(app): State<AppState>,
    Json(body): Json<PayOrderRequest>,
) -> impl IntoResponse {
    let amount_cents = kes_to_cents(body.amount_kes);

    match calculate_order_fee(
        &app.pg,
        amount_cents,
        &crate::services::fee::PaymentMethod::Wallet,
    )
    .await
    {
        Ok(fees) => Json(FeePreviewResponse {
            gross_kes:        fees.gross_cents        as f64 / 100.0,
            fw_fee_kes:       0.0,
            platform_fee_kes: fees.platform_fee_cents as f64 / 100.0,
            buyer_pays_kes:   fees.gross_cents        as f64 / 100.0,
            seller_gets_kes:  fees.net_to_seller      as f64 / 100.0,
        })
        .into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    }
}

// ── POST /api/wallet/withdraw ──────────────────────────────────────────────────

/// Initiate a withdrawal from wallet balance (seller payout).
#[utoipa::path(
    post,
    path = "/api/wallet/withdraw",
    request_body = WithdrawRequest,
    responses(
        (status = 200, description = "Withdrawal initiated",   body = WalletTxResponse),
        (status = 400, description = "Insufficient balance or bad request"),
        (status = 401, description = "Unauthorized"),
    ),
    security(("bearer_auth" = [])),
    tag = "Wallet"
)]
pub async fn withdraw(
    State(app): State<AppState>,
    Json(body): Json<WithdrawRequest>,
) -> impl IntoResponse {
    let seller_id    = Uuid::new_v4(); // TODO: from JWT
    let amount_cents = kes_to_cents(body.amount_kes);

    match wallet_svc::initiate_withdrawal(&app.pg, seller_id, amount_cents).await {
        Ok(tx) => Json(WalletTxResponse::from(tx)).into_response(),
        Err(e) => (StatusCode::BAD_REQUEST, e.to_string()).into_response(),
    }
}

// ── GET /api/wallet/transactions ──────────────────────────────────────────────

#[derive(Deserialize, utoipa::IntoParams)]
pub struct PaginationParams {
    /// Max number of records to return (default 20, max 100)
    pub limit:  Option<i64>,
    /// Number of records to skip (default 0)
    pub offset: Option<i64>,
}

/// List wallet transactions for the authenticated user, paginated.
#[utoipa::path(
    get,
    path = "/api/wallet/transactions",
    params(PaginationParams),
    responses(
        (status = 200, description = "Transaction list",       body = Vec<WalletTxResponse>),
        (status = 401, description = "Unauthorized"),
        (status = 500, description = "Internal server error"),
    ),
    security(("bearer_auth" = [])),
    tag = "Wallet"
)]
pub async fn get_transactions(
    State(app):    State<AppState>,
    Query(params): Query<PaginationParams>,
) -> impl IntoResponse {
    let user_id = Uuid::new_v4(); // TODO: from JWT
    let limit   = params.limit.unwrap_or(20).min(100);
    let offset  = params.offset.unwrap_or(0);

    match wallet_svc::get_transactions(&app.pg, user_id, limit, offset).await {
        Ok(txs) => {
            let response: Vec<WalletTxResponse> =
                txs.into_iter().map(WalletTxResponse::from).collect();
            Json(response).into_response()
        }
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    }
}