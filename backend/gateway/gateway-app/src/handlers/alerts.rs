use axum::{extract::State, http::StatusCode, Json};
use serde::Serialize;
use serde_json::{json, Value};
use std::sync::Arc;
use crate::{redis_helpers::with_redis, state::AppState};
use tracing::error;

// ── Inline schemas ────────────────────────────────────────────────────────────

/// List of active alerts.
#[derive(Serialize, utoipa::ToSchema)]
pub struct AlertListResponse {
    /// One entry per device that has an active alert in Redis
    pub alerts: Vec<Value>,
}

/// Generic error body.
#[derive(Serialize, utoipa::ToSchema)]
pub struct AlertErrorResponse {
    pub error: String,
}

// ── Handler ───────────────────────────────────────────────────────────────────

/// List all active device alerts.
///
/// Scans the Redis keyspace for `alerts:*` keys and returns every
/// alert that is currently active. An empty array means no devices
/// are currently alerting.
#[utoipa::path(
    get,
    path = "/api/alerts",
    tag = "Devices",
    responses(
        (status = 200, description = "Active alert list",  body = AlertListResponse),
        (status = 500, description = "Redis/cache error",  body = AlertErrorResponse),
    ),
    security(("bearerAuth" = []))
)]
pub async fn get_alerts(
    State(state): State<Arc<AppState>>,
) -> Result<Json<Value>, (StatusCode, Json<Value>)> {
    let alerts = with_redis(state.redis.clone(), |conn| {
        let keys: Vec<String> = redis::cmd("KEYS").arg("alerts:*").query(conn).unwrap_or_default();
        let mut alerts = Vec::new();
        for key in &keys {
            let val: Option<String> = redis::Commands::get(conn, key).unwrap_or(None);
            if let Some(s) = val {
                if let Ok(parsed) = serde_json::from_str::<Value>(&s) {
                    alerts.push(parsed);
                }
            }
        }
        Ok(alerts)
    }).await.map_err(|e| {
        error!("redis error: {}", e);
        (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({ "error": e.to_string() })))
    })?;

    Ok(Json(json!({ "alerts": alerts })))
}