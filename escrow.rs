use axum::extract::{Path, State};
use axum::http::{HeaderMap, StatusCode};
use axum::response::IntoResponse;
use axum::{body::Bytes, Json};
use serde_json::json;
use std::sync::Arc;
use uuid::Uuid;

use crate::models::escrow::{AdminRulingRequest, CreateEscrowRequest, EscrowAction, EscrowResponse, RaiseDisputeRequest};
use crate::services::{escrow as escrow_svc, flutterwave as fw_svc};
use crate::services::escrow_api as escrow_api;
use crate::state::AppState;

pub async fn create_escrow(
    State(app): State<Arc<AppState>>,
    Json(body): Json<CreateEscrowRequest>,
) -> impl IntoResponse {
    let buyer_id = Uuid::new_v4(); // TODO: replace with authenticated user ID from JWT
    let currency = body.currency.unwrap_or_else(|| "KES".to_string());

    match escrow_svc::create_escrow(
        &app.pg,
        body.order_id,
        buyer_id,
        body.seller_id,
        body.amount,
        currency.clone(),
    )
    .await
    {
        Ok(tx) => Json(EscrowResponse::from(tx)).into_response(),
        Err(e) => {
            // fallback to in-memory if enabled
            if std::env::var("IN_MEMORY_ESCROW").ok().as_deref() == Some("1") {
                match escrow_api::create_escrow(&app.pg, body.order_id, buyer_id, body.seller_id, body.amount, currency).await {
                    Ok(resp) => return Json(resp).into_response(),
                    Err(e2) => return (axum::http::StatusCode::BAD_REQUEST, e2.to_string()).into_response(),
                }
            }
            (axum::http::StatusCode::BAD_REQUEST, e.to_string()).into_response()
        }
    }
}

pub async fn get_escrow(
    State(app): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
) -> impl IntoResponse {
    match escrow_svc::get_escrow(&app.pg, id).await {
        Ok(tx) => Json(EscrowResponse::from(tx)).into_response(),
        Err(e) => {
            if std::env::var("IN_MEMORY_ESCROW").ok().as_deref() == Some("1") {
                match escrow_api::get_escrow(&app.pg, id).await {
                    Ok(resp) => return Json(resp).into_response(),
                    Err(_) => return (axum::http::StatusCode::NOT_FOUND, "not found".to_string()).into_response(),
                }
            }
            (axum::http::StatusCode::NOT_FOUND, e.to_string()).into_response()
        }
    }
}

pub async fn confirm_delivery(
    State(app): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
) -> impl IntoResponse {
    let buyer_id = Uuid::new_v4(); // TODO: replace with authenticated user ID from JWT

    match escrow_svc::apply_transition(
        &app.pg,
        id,
        crate::models::escrow::EscrowAction::ConfirmDelivery,
        Some(buyer_id),
        None,
    )
    .await
    {
        Ok(tx) => Json(EscrowResponse::from(tx)).into_response(),
        Err(e) => {
            if std::env::var("IN_MEMORY_ESCROW").ok().as_deref() == Some("1") {
                match escrow_api::apply_transition(&app.pg, id, crate::models::escrow::EscrowAction::ConfirmDelivery, Some(buyer_id), None).await {
                    Ok(resp) => return Json(resp).into_response(),
                    Err(e2) => return (axum::http::StatusCode::BAD_REQUEST, e2.to_string()).into_response(),
                }
            }
            (axum::http::StatusCode::BAD_REQUEST, e.to_string()).into_response()
        }
    }
}

pub async fn raise_dispute(
    State(app): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
    Json(body): Json<RaiseDisputeRequest>,
) -> impl IntoResponse {
    let buyer_id = Uuid::new_v4(); // TODO: replace with authenticated user ID from JWT

    match escrow_svc::raise_dispute(&app.pg, id, buyer_id, body.reason.clone()).await {
        Ok(tx) => Json(EscrowResponse::from(tx)).into_response(),
        Err(e) => {
            if std::env::var("IN_MEMORY_ESCROW").ok().as_deref() == Some("1") {
                match escrow_api::raise_dispute(&app.pg, id, buyer_id, body.reason.clone()).await {
                    Ok(resp) => return Json(resp).into_response(),
                    Err(e2) => return (axum::http::StatusCode::BAD_REQUEST, e2.to_string()).into_response(),
                }
            }
            (axum::http::StatusCode::BAD_REQUEST, e.to_string()).into_response()
        }
    }
}

pub async fn admin_ruling(
    State(app): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
    Json(body): Json<AdminRulingRequest>,
) -> impl IntoResponse {
    let admin_id = Uuid::new_v4(); // TODO: replace with authenticated admin ID from JWT

    match escrow_svc::admin_ruling(&app.pg, id, admin_id, body.ruling.clone()).await {
        Ok(tx) => Json(EscrowResponse::from(tx)).into_response(),
        Err(e) => {
            if std::env::var("IN_MEMORY_ESCROW").ok().as_deref() == Some("1") {
                match escrow_api::admin_ruling(&app.pg, id, admin_id, body.ruling.clone()).await {
                    Ok(resp) => return Json(resp).into_response(),
                    Err(e2) => return (axum::http::StatusCode::BAD_REQUEST, e2.to_string()).into_response(),
                }
            }
            (axum::http::StatusCode::BAD_REQUEST, e.to_string()).into_response()
        }
    }
}

pub async fn flutterwave_webhook(
    State(app): State<Arc<AppState>>,
    headers: HeaderMap,
    body: Bytes,
) -> impl IntoResponse {
    let header_sig = headers
        .get("verif-hash")
        .and_then(|value| value.to_str().ok())
        .unwrap_or("");

    let secret_key = app.flutterwave_secret.clone();
    if secret_key.is_empty() {
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            "useSettings".to_string(),
        )
            .into_response();
    }

    if !fw_svc::verify_webhook_signature(&body, header_sig, &secret_key) {
        return (
            axum::http::StatusCode::UNAUTHORIZED,
            "Invalid webhook signature".to_string(),
        )
        .into_response();
    }

    let webhook: fw_svc::FlutterwaveWebhook = match serde_json::from_slice(&body) {
        Ok(payload) => payload,
        Err(err) => {
            return (
                axum::http::StatusCode::BAD_REQUEST,
                format!("Invalid webhook payload: {}", err),
            )
            .into_response();
        }
    };

    let escrow = match escrow_svc::get_escrow_by_fw_tx_ref(&app.pg, &webhook.data.tx_ref).await {
        Ok(escrow) => EscrowResponse::from(escrow),
        Err(err) => {
            if std::env::var("IN_MEMORY_ESCROW").ok().as_deref() == Some("1") {
                match escrow_api::get_escrow_by_fw_tx_ref(&app.pg, &webhook.data.tx_ref).await {
                    Ok(e) => e,
                    Err(e2) => {
                        return (
                            axum::http::StatusCode::NOT_FOUND,
                            e2.to_string(),
                        )
                        .into_response();
                    }
                }
            } else {
                return (
                    axum::http::StatusCode::NOT_FOUND,
                    err.to_string(),
                )
                .into_response();
            }
        }
    };

    let action = match (webhook.event.as_str(), webhook.data.status.as_str()) {
        ("charge.completed", "successful") => EscrowAction::PaymentConfirmed,
        ("charge.completed", "failed") | ("charge.failed", "failed") => EscrowAction::PaymentFailed,
        _ => {
            return (
                StatusCode::OK,
                format!("Ignored webhook event/status: {} / {}", webhook.event, webhook.data.status),
            )
            .into_response();
        }
    };

    let client = app.http_client.clone();
    match fw_svc::verify_charge(&client, &webhook.data.id.to_string(), &secret_key, &webhook.data.status).await {
        Ok(true) => (),
        Ok(false) => {
            return (
                StatusCode::BAD_REQUEST,
                "Charge verification did not match Flutterwave status".to_string(),
            )
            .into_response();
        }
        Err(err) => {
            return (
                StatusCode::BAD_REQUEST,
                err.to_string(),
            )
            .into_response();
        }
    }

    match escrow_svc::apply_transition(
        &app.pg,
        escrow.id,
        action.clone(),
        None,
        Some(json!({
            "flw_ref": webhook.data.flw_ref,
            "charge_id": webhook.data.id,
            "status": webhook.data.status,
        })),
    )
    .await
    {
        Ok(tx) => Json(EscrowResponse::from(tx)).into_response(),
        Err(e) => {
            if std::env::var("IN_MEMORY_ESCROW").ok().as_deref() == Some("1") {
                match escrow_api::apply_transition(&app.pg, escrow.id, action.clone(), None, Some(json!({
                    "flw_ref": webhook.data.flw_ref,
                    "charge_id": webhook.data.id,
                    "status": webhook.data.status,
                }))).await {
                    Ok(resp) => return Json(resp).into_response(),
                    Err(e2) => return (axum::http::StatusCode::BAD_REQUEST, e2.to_string()).into_response(),
                }
            }
            (axum::http::StatusCode::BAD_REQUEST, e.to_string()).into_response()
        }
    }
}
