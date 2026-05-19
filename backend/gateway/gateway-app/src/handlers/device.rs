use axum::{extract::Path, Json};
use crate::models::probe::Device;
use crate::state::AppState;
use axum::extract::State;
use std::sync::Arc;

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