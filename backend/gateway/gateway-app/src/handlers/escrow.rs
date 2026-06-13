use axum::extract::{Extension, Path, State};
use axum::http::{HeaderMap, StatusCode};
use axum::response::IntoResponse;
use axum::{body::Bytes, Json};
use serde_json::json;
use std::sync::Arc;
use uuid::Uuid;

use crate::models::Claims;
use crate::models::escrow::{
    AdminRulingRequest,
    CreateEscrowRequest,
    EscrowAction,
    EscrowResponse,
    InitiatePaymentRequest,
    InitiatePaymentResponse,
    RaiseDisputeRequest,
};
use crate::services::{escrow as escrow_svc, flutterwave as fw_svc};
use crate::state::AppState;

// ── Helper: resolve email -> UUID ──────────────────────────────────────────────

async fn resolve_buyer(
    pool:  &sqlx::PgPool,
    email: &str,
) -> Result<Uuid, (StatusCode, String)> {
    escrow_svc::get_user_id_by_email(pool, email)
        .await
        .map_err(|e| (StatusCode::UNAUTHORIZED, e.to_string()))
}

// ── POST /api/escrow ───────────────────────────────────────────────────────────

/// Create a new escrow transaction (state = Created).
/// Does NOT contact Flutterwave yet — call initiate-payment next.
#[utoipa::path(
    post,
    path = "/api/escrow",
    request_body = CreateEscrowRequest,
    responses(
        (status = 200, description = "Escrow created",        body = EscrowResponse),
        (status = 400, description = "Bad request"),
        (status = 401, description = "Unauthorized"),
    ),
    security(("bearer_auth" = [])),
    tag = "Escrow"
)]
pub async fn create_escrow(
    State(app):        State<Arc<AppState>>,
    Extension(claims): Extension<Claims>,
    Json(body):        Json<CreateEscrowRequest>,
) -> impl IntoResponse {
    let buyer_id = match resolve_buyer(&app.pg, &claims.sub).await {
        Ok(id) => id,
        Err((code, msg)) => return (code, msg).into_response(),
    };

    let currency = body.currency.unwrap_or_else(|| "KES".to_string());
    let seller_id = body.seller_id;

    match escrow_svc::create_escrow(
        &app.pg,
        body.order_id,
        buyer_id,
        seller_id,
        body.amount,
        currency,
    )
    .await
    {
        Ok(tx)  => Json(EscrowResponse::from(tx)).into_response(),
        Err(e)  => (StatusCode::BAD_REQUEST, e.to_string()).into_response(),
    }
}

// ── POST /api/escrow/:id/initiate-payment ─────────────────────────────────────

/// Generate a Flutterwave payment link for an existing escrow.
/// Transitions state to PaymentPending and returns the redirect URL.
#[utoipa::path(
    post,
    path = "/api/escrow/{id}/initiate-payment",
    params(
        ("id" = Uuid, Path, description = "Escrow transaction ID"),
    ),
    request_body = InitiatePaymentRequest,
    responses(
        (status = 200, description = "Payment link created",  body = InitiatePaymentResponse),
        (status = 400, description = "Bad request / invalid state transition"),
        (status = 401, description = "Unauthorized"),
        (status = 403, description = "Forbidden — not your escrow"),
        (status = 404, description = "Escrow not found"),
        (status = 502, description = "Flutterwave error"),
    ),
    security(("bearer_auth" = [])),
    tag = "Escrow"
)]
pub async fn initiate_payment(
    State(app):        State<Arc<AppState>>,
    Extension(claims): Extension<Claims>,
    Path(id):          Path<Uuid>,
    Json(body):        Json<InitiatePaymentRequest>,
) -> impl IntoResponse {
    let buyer_id = match resolve_buyer(&app.pg, &claims.sub).await {
        Ok(id) => id,
        Err((code, msg)) => return (code, msg).into_response(),
    };

    let escrow = match escrow_svc::get_escrow(&app.pg, id).await {
        Ok(e)  => e,
        Err(e) => return (StatusCode::NOT_FOUND, e.to_string()).into_response(),
    };

    if escrow.buyer_id != buyer_id {
        return (StatusCode::FORBIDDEN, "Not your escrow".to_string()).into_response();
    }

    let fw_tx_ref = format!("nextbit-escrow-{}-{}", id, Uuid::new_v4());

    if let Err(e) = escrow_svc::save_fw_tx_ref(&app.pg, id, &fw_tx_ref).await {
        return (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response();
    }

    if let Err(e) = escrow_svc::apply_transition(
        &app.pg,
        id,
        EscrowAction::InitiatePayment,
        Some(buyer_id),
        None,
    )
    .await
    {
        return (StatusCode::BAD_REQUEST, e.to_string()).into_response();
    }

    let amount: f64 = escrow.amount.to_string().parse().unwrap_or(0.0);
    let fw_request = fw_svc::PaymentLinkRequest {
        tx_ref:   fw_tx_ref.clone(),
        amount,
        currency: escrow.currency,
        redirect_url: body.redirect_url,
        customer: fw_svc::PaymentCustomer {
            email: body.buyer_email,
            name:  body.buyer_name,
        },
        customizations: fw_svc::PaymentCustomizations {
            title:       "NextBit Escrow Payment".to_string(),
            description: format!("Secure payment for order {}", escrow.order_id),
        },
    };

    match app.flutterwave.create_payment_link(fw_request).await {
        Ok(url) => Json(InitiatePaymentResponse {
            payment_url: url,
            fw_tx_ref,
        })
        .into_response(),
        Err(e) => (StatusCode::BAD_GATEWAY, e.to_string()).into_response(),
    }
}

// ── GET /api/escrow/:id ────────────────────────────────────────────────────────

/// Retrieve an escrow transaction by ID.
#[utoipa::path(
    get,
    path = "/api/escrow/{id}",
    params(
        ("id" = Uuid, Path, description = "Escrow transaction ID"),
    ),
    responses(
        (status = 200, description = "Escrow found",   body = EscrowResponse),
        (status = 404, description = "Escrow not found"),
    ),
    tag = "Escrow"
)]
pub async fn get_escrow(
    State(app): State<Arc<AppState>>,
    Path(id):   Path<Uuid>,
) -> impl IntoResponse {
    match escrow_svc::get_escrow(&app.pg, id).await {
        Ok(tx)  => Json(EscrowResponse::from(tx)).into_response(),
        Err(e)  => (StatusCode::NOT_FOUND, e.to_string()).into_response(),
    }
}

// ── POST /api/escrow/:id/confirm-delivery ─────────────────────────────────────

/// Buyer confirms delivery, releasing funds to the seller.
#[utoipa::path(
    post,
    path = "/api/escrow/{id}/confirm-delivery",
    params(
        ("id" = Uuid, Path, description = "Escrow transaction ID"),
    ),
    responses(
        (status = 200, description = "Delivery confirmed",    body = EscrowResponse),
        (status = 400, description = "Bad request / invalid state transition"),
        (status = 401, description = "Unauthorized"),
        (status = 403, description = "Forbidden — not your escrow"),
        (status = 404, description = "Escrow not found"),
    ),
    security(("bearer_auth" = [])),
    tag = "Escrow"
)]
pub async fn confirm_delivery(
    State(app):        State<Arc<AppState>>,
    Extension(claims): Extension<Claims>,
    Path(id):          Path<Uuid>,
) -> impl IntoResponse {
    let buyer_id = match resolve_buyer(&app.pg, &claims.sub).await {
        Ok(id) => id,
        Err((code, msg)) => return (code, msg).into_response(),
    };

    let escrow = match escrow_svc::get_escrow(&app.pg, id).await {
        Ok(e)  => e,
        Err(e) => return (StatusCode::NOT_FOUND, e.to_string()).into_response(),
    };

    if escrow.buyer_id != buyer_id {
        return (StatusCode::FORBIDDEN, "Not your escrow".to_string()).into_response();
    }

    match escrow_svc::apply_transition(
        &app.pg,
        id,
        EscrowAction::ConfirmDelivery,
        Some(buyer_id),
        None,
    )
    .await
    {
        Ok(tx)  => Json(EscrowResponse::from(tx)).into_response(),
        Err(e)  => (StatusCode::BAD_REQUEST, e.to_string()).into_response(),
    }
}

// ── POST /api/escrow/:id/dispute ───────────────────────────────────────────────

/// Buyer raises a dispute, halting fund release pending admin review.
#[utoipa::path(
    post,
    path = "/api/escrow/{id}/dispute",
    params(
        ("id" = Uuid, Path, description = "Escrow transaction ID"),
    ),
    request_body = RaiseDisputeRequest,
    responses(
        (status = 200, description = "Dispute raised",        body = EscrowResponse),
        (status = 400, description = "Bad request / invalid state transition"),
        (status = 401, description = "Unauthorized"),
        (status = 403, description = "Forbidden — not your escrow"),
        (status = 404, description = "Escrow not found"),
    ),
    security(("bearer_auth" = [])),
    tag = "Escrow"
)]
pub async fn raise_dispute(
    State(app):        State<Arc<AppState>>,
    Extension(claims): Extension<Claims>,
    Path(id):          Path<Uuid>,
    Json(body):        Json<RaiseDisputeRequest>,
) -> impl IntoResponse {
    let buyer_id = match resolve_buyer(&app.pg, &claims.sub).await {
        Ok(id) => id,
        Err((code, msg)) => return (code, msg).into_response(),
    };

    let escrow = match escrow_svc::get_escrow(&app.pg, id).await {
        Ok(e)  => e,
        Err(e) => return (StatusCode::NOT_FOUND, e.to_string()).into_response(),
    };

    if escrow.buyer_id != buyer_id {
        return (StatusCode::FORBIDDEN, "Not your escrow".to_string()).into_response();
    }

    match escrow_svc::raise_dispute(&app.pg, id, buyer_id, body.reason).await {
        Ok(tx)  => Json(EscrowResponse::from(tx)).into_response(),
        Err(e)  => (StatusCode::BAD_REQUEST, e.to_string()).into_response(),
    }
}

// ── POST /api/escrow/:id/admin-ruling ─────────────────────────────────────────

/// Admin issues a ruling on a disputed escrow.
/// TODO: add role guard middleware to restrict to admin role only.
#[utoipa::path(
    post,
    path = "/api/escrow/{id}/admin-ruling",
    params(
        ("id" = Uuid, Path, description = "Escrow transaction ID"),
    ),
    request_body = AdminRulingRequest,
    responses(
        (status = 200, description = "Ruling applied",        body = EscrowResponse),
        (status = 400, description = "Bad request / invalid state transition"),
        (status = 401, description = "Unauthorized"),
    ),
    security(("bearer_auth" = [])),
    tag = "Escrow"
)]
pub async fn admin_ruling(
    State(app):        State<Arc<AppState>>,
    Extension(claims): Extension<Claims>,
    Path(id):          Path<Uuid>,
    Json(body):        Json<AdminRulingRequest>,
) -> impl IntoResponse {
    let admin_id = match resolve_buyer(&app.pg, &claims.sub).await {
        Ok(id) => id,
        Err((code, msg)) => return (code, msg).into_response(),
    };

    match escrow_svc::admin_ruling(&app.pg, id, admin_id, body.ruling).await {
        Ok(tx)  => Json(EscrowResponse::from(tx)).into_response(),
        Err(e)  => (StatusCode::BAD_REQUEST, e.to_string()).into_response(),
    }
}

// ── POST /api/webhooks/flutterwave ─────────────────────────────────────────────

/// Flutterwave payment webhook. Public route — verified via HMAC hash header.
#[utoipa::path(
    post,
    path = "/api/webhooks/flutterwave",
    responses(
        (status = 200, description = "Webhook processed",     body = EscrowResponse),
        (status = 400, description = "Invalid payload or charge mismatch"),
        (status = 401, description = "Invalid webhook signature"),
        (status = 404, description = "Escrow not found for tx_ref"),
        (status = 502, description = "Flutterwave verification error"),
    ),
    tag = "Webhooks"
)]
pub async fn flutterwave_webhook(
    State(app): State<Arc<AppState>>,
    headers:    HeaderMap,
    body:       Bytes,
) -> impl IntoResponse {
    // 1. Verify signature
    let header_sig = headers
        .get("verif-hash")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("");

    if !app.flutterwave.verify_webhook(header_sig) {
        return (StatusCode::UNAUTHORIZED, "Invalid webhook signature").into_response();
    }

    // 2. Parse payload
    let webhook: fw_svc::FlutterwaveWebhook = match serde_json::from_slice(&body) {
        Ok(p)  => p,
        Err(e) => return (StatusCode::BAD_REQUEST, format!("Invalid payload: {}", e)).into_response(),
    };

    // 3. Look up escrow by fw_tx_ref
    let escrow = match escrow_svc::get_escrow_by_fw_tx_ref(&app.pg, &webhook.data.tx_ref).await {
        Ok(e)  => e,
        Err(e) => return (StatusCode::NOT_FOUND, e.to_string()).into_response(),
    };

    // 4. Determine action from event + status
    let action = match (webhook.event.as_str(), webhook.data.status.as_str()) {
        ("charge.completed", "successful") => EscrowAction::PaymentConfirmed,
        ("charge.completed", "failed") | ("charge.failed", _) => EscrowAction::PaymentFailed,
        _ => {
            return (
                StatusCode::OK,
                format!("Ignored: {}/{}", webhook.event, webhook.data.status),
            )
            .into_response();
        }
    };

    // 5. Re-verify with Flutterwave API
    match app.flutterwave.verify_charge(
        &webhook.data.id.to_string(),
        &webhook.data.status,
    )
    .await
    {
        Ok(true)  => (),
        Ok(false) => return (StatusCode::BAD_REQUEST, "Charge verification mismatch").into_response(),
        Err(e)    => return (StatusCode::BAD_GATEWAY, e.to_string()).into_response(),
    }

    // 6. Save fw_charge_id if this is a successful payment
    if matches!(action, EscrowAction::PaymentConfirmed) {
        let _ = sqlx::query(
            r#"UPDATE escrow_transactions SET fw_charge_id = $1 WHERE id = $2"#,
        )
        .bind(webhook.data.id.to_string())
        .bind(escrow.id)
        .execute(&app.pg)
        .await;
    }

    // 7. Apply transition
    match escrow_svc::apply_transition(
        &app.pg,
        escrow.id,
        action,
        None,
        Some(json!({
            "flw_ref":   webhook.data.flw_ref,
            "charge_id": webhook.data.id,
            "status":    webhook.data.status,
        })),
    )
    .await
    {
        Ok(tx)  => Json(EscrowResponse::from(tx)).into_response(),
        Err(e)  => (StatusCode::BAD_REQUEST, e.to_string()).into_response(),
    }
}