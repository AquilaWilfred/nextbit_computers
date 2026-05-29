use axum::{
    routing::{get, post},
    Router,
};

use crate::{handlers::escrow as escrow_handler, state::AppState};

pub fn escrow_routes() -> Router<AppState> {
    Router::new()
        // Step 1: buyer creates escrow (state = Created)
        .route("/api/escrow",                           post(escrow_handler::create_escrow))

        // Step 2: buyer initiates payment — gets back a Flutterwave URL to redirect to
        .route("/api/escrow/:id/initiate-payment",      post(escrow_handler::initiate_payment))

        // Step 3: Flutterwave fires webhook → state moves to FundsHeldInEscrow (public, HMAC verified)
        // This route is registered in main.rs under public routes — DO NOT add auth middleware here

        // Step 4: buyer confirms delivery
        .route("/api/escrow/:id/confirm-delivery",      post(escrow_handler::confirm_delivery))

        // Step 5: buyer raises dispute (if needed)
        .route("/api/escrow/:id/dispute",               post(escrow_handler::raise_dispute))

        // Admin only — add role guard middleware here when role is in JWT
        .route("/api/escrow/:id/admin-ruling",          post(escrow_handler::admin_ruling))

        // Read
        .route("/api/escrow/:id",                       get(escrow_handler::get_escrow))
}