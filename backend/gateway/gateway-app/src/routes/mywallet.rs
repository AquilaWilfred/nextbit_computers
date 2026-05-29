// ── MyWallet Routes ────────────────────────────────────────────────────────────

use axum::{
    routing::post,
    Router,
};

use crate::handlers::mywallet::{
    get_my_wallet,
    load_wallet,
    withdraw_from_wallet,
    wallet_stk_callback,
    wallet_b2c_result,
};
use crate::state::AppState;

/// User-facing wallet routes — require JWT auth
pub fn mywallet_api_routes() -> Router<AppState> {
    Router::new()
        .route("/api/mywallet",          axum::routing::get(get_my_wallet))
        .route("/api/mywallet/load",     post(load_wallet))
        .route("/api/mywallet/withdraw", post(withdraw_from_wallet))
}

/// Daraja callbacks for wallet — no auth, IP allowlist only
pub fn mywallet_callback_routes() -> Router<AppState> {
    Router::new()
        .route("/daraja/mywallet/stk/callback", post(wallet_stk_callback))
        .route("/daraja/mywallet/b2c/result",   post(wallet_b2c_result))
}