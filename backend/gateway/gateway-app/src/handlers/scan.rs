use axum::{extract::Path, Json};
use crate::models::probe::{Scan, Device};
use crate::state::AppState;
use axum::extract::State;
use std::sync::Arc;
use sqlx::Row;

pub async fn get_device_scans(
    State(state): State<Arc<AppState>>,
    Path(device_id): Path<String>,
) -> Result<Json<Vec<Scan>>, axum::http::StatusCode> {
    // First get device id
    let device_row = sqlx::query("SELECT id FROM devices WHERE device_id = $1")
        .bind(device_id)
        .fetch_optional(&state.pg)
        .await
        .map_err(|_| axum::http::StatusCode::INTERNAL_SERVER_ERROR)?;

    let device_row = match device_row {
        Some(row) => row,
        None => return Err(axum::http::StatusCode::NOT_FOUND),
    };

    let device_pk_id: uuid::Uuid = device_row.get("id");

    let scans = sqlx::query_as::<_, Scan>(
        "SELECT id, device_id, scan_id, data, created_at FROM scans WHERE device_id = $1 ORDER BY created_at DESC"
    )
    .bind(device_pk_id)
    .fetch_all(&state.pg)
    .await
    .map_err(|_| axum::http::StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(scans))
}

pub async fn get_scan(
    State(state): State<Arc<AppState>>,
    Path((device_id, scan_id)): Path<(String, String)>,
) -> Result<Json<Scan>, axum::http::StatusCode> {
    let scan = sqlx::query_as::<_, Scan>(
        r#"
        SELECT s.id, s.device_id, s.scan_id, s.data, s.created_at
        FROM scans s
        JOIN devices d ON s.device_id = d.id
        WHERE d.device_id = $1 AND s.scan_id = $2
        "#
    )
    .bind(device_id)
    .bind(scan_id)
    .fetch_optional(&state.pg)
    .await
    .map_err(|_| axum::http::StatusCode::INTERNAL_SERVER_ERROR)?;

    match scan {
        Some(s) => Ok(Json(s)),
        None => Err(axum::http::StatusCode::NOT_FOUND),
    }
}