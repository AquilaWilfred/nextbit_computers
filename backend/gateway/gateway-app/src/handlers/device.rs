use axum::{extract::Path, extract::State, Json};
use serde::Serialize;
use std::sync::Arc;
use crate::models::probe::Device;
use crate::state::AppState;

// ── Inline schemas ────────────────────────────────────────────────────────────

/// List of devices.
#[derive(Serialize, utoipa::ToSchema)]
pub struct DeviceListResponse {
    pub devices: Vec<Device>,
}

/// Generic error body.
#[derive(Serialize, utoipa::ToSchema)]
pub struct DeviceErrorResponse {
    pub error: String,
}

// ── Handlers ──────────────────────────────────────────────────────────────────

/// List all registered devices.
///
/// Returns up to 1 000 devices ordered by `last_seen` descending.
#[utoipa::path(
    get,
    path = "/api/devices",
    tag = "Devices",
    responses(
        (status = 200, description = "Device list",    body = Vec<Device>),
        (status = 500, description = "Database error", body = DeviceErrorResponse),
    )
)]
pub async fn get_all_devices(
    State(state): State<Arc<AppState>>,
) -> Result<Json<Vec<Device>>, axum::http::StatusCode> {
    let devices = sqlx::query_as::<_, Device>(
        "SELECT id, device_id, serial, machine_id, mac_addresses, manufacturer, model, shop_id, created_at, last_seen FROM devices ORDER BY last_seen DESC LIMIT 1000"
    )
    .fetch_all(&state.pg)
    .await
    .map_err(|_| axum::http::StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(devices))
}

/// Get a single device by its device ID.
#[utoipa::path(
    get,
    path = "/api/devices/{id}",
    tag = "Devices",
    params(
        ("id" = String, Path, description = "The device_id of the device to retrieve")
    ),
    responses(
        (status = 200, description = "Device found",   body = Device),
        (status = 404, description = "Device not found"),
        (status = 500, description = "Database error", body = DeviceErrorResponse),
    )
)]
pub async fn get_device(
    State(state): State<Arc<AppState>>,
    Path(id): Path<String>,
) -> Result<Json<Device>, axum::http::StatusCode> {
    let device = sqlx::query_as::<_, Device>(
        "SELECT id, device_id, serial, machine_id, mac_addresses, manufacturer, model, shop_id, created_at, last_seen FROM devices WHERE device_id = $1"
    )
    .bind(id)
    .fetch_optional(&state.pg)
    .await
    .map_err(|_| axum::http::StatusCode::INTERNAL_SERVER_ERROR)?;

    match device {
        Some(d) => Ok(Json(d)),
        None => Err(axum::http::StatusCode::NOT_FOUND),
    }
}