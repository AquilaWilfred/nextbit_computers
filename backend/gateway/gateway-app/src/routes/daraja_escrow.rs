// ── Daraja Escrow Routes ───────────────────────────────────────────────────────
// Two sets of routes:
//
//   1. /api/escrow/:id/daraja/...   — buyer/admin facing (needs auth middleware)
//   2. /daraja/...                  — Daraja callback URLs (NO auth — IP allowlist instead)
//
// Register both in mod.rs (or main.rs) as separate routers.

use axum::{
    routing::{get, post},
    Router,
};

use crate::handlers::daraja_escrow::{
    initiate_daraja_payment,
    stk_callback,
    c2b_validation,
    c2b_confirmation,
    b2c_result,
    b2c_timeout,
    tax_result,
    balance_result,
    orginfo_result,
    txstatus_result,
    admin_release_payout,
    admin_trigger_refund,
};
use crate::state::AppState;

/// Buyer/admin-facing routes — require JWT auth middleware
pub fn daraja_escrow_api_routes() -> Router<AppState> {
    Router::new()
        // Buyer initiates STK push for an escrow
        .route("/api/escrow/:escrow_id/daraja/pay",     post(initiate_daraja_payment))
        // Admin triggers payout/refund after ruling
        .route("/api/escrow/:escrow_id/daraja/release", post(admin_release_payout))
        .route("/api/escrow/:escrow_id/daraja/refund",  post(admin_trigger_refund))
}

/// Daraja callback routes — NO auth middleware (Daraja doesn't send JWT)
/// These must be publicly reachable via HTTPS.
/// Protect with Daraja IP allowlist at your reverse proxy / cloud firewall.
pub fn daraja_callback_routes() -> Router<AppState> {
    Router::new()
        // STK Push callbacks
        .route("/daraja/stk/callback",         post(stk_callback))
        // C2B Paybill/Till callbacks
        .route("/daraja/c2b/validation",       post(c2b_validation))
        .route("/daraja/c2b/confirmation",     post(c2b_confirmation))
        // B2C (payout/refund) callbacks
        .route("/daraja/b2c/result",           post(b2c_result))
        .route("/daraja/b2c/timeout",          post(b2c_timeout))
        // Tax remittance callbacks
        .route("/daraja/tax/result",           post(tax_result))
        .route("/daraja/tax/timeout",          post(b2c_timeout))   // reuse — same handling
        // Account balance callbacks
        .route("/daraja/balance/result",       post(balance_result))
        .route("/daraja/balance/timeout",      post(b2c_timeout))
        // Org info callbacks
        .route("/daraja/orginfo/result",       post(orginfo_result))
        .route("/daraja/orginfo/timeout",      post(b2c_timeout))
        // Transaction status callbacks
        .route("/daraja/txstatus/result",      post(txstatus_result))
        .route("/daraja/txstatus/timeout",     post(b2c_timeout))
}