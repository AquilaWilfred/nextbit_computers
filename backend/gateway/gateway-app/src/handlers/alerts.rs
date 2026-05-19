use axum::{extract::State, http::StatusCode, Json};
use serde_json::{json, Value};
use std::sync::Arc;
use crate::{redis_helpers::with_redis, state::AppState};
use tracing::error;

pub async fn get_alerts(State(state): State<Arc<AppState>>) -> Result<Json<Value>, (StatusCode, Json<Value>)> {
    let alerts = with_redis(state.redis.clone(), |conn| {
        let keys: Vec<String> = redis::cmd("KEYS").arg("alerts:*").query(conn).unwrap_or_default();
        let mut alerts = Vec::new();
        for key in &keys {
            let val: Option<String> = redis::Commands::get(conn, key).unwrap_or(None);
            if let Some(s) = val {
                if let Ok(parsed) = serde_json::from_str::<Value>(&s) { alerts.push(parsed); }
            }
        }
        Ok(alerts)
    }).await.map_err(|e| {
        error!("redis error: {}", e);
        (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({ "error": e.to_string() })))
    })?;
    Ok(Json(json!({ "alerts": alerts })))
}
