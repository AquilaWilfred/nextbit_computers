use axum::{extract::State, Json};
use mongodb::bson::doc;
use serde_json::{json, Value};
use std::sync::Arc;
use crate::{redis_helpers::with_redis, state::AppState};

pub async fn debug_postgres(State(state): State<Arc<AppState>>) -> Json<Value> {
    let probe_count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM probe_reports").fetch_one(&state.pg).await.unwrap_or(0);
    let asset_count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM assets").fetch_one(&state.pg).await.unwrap_or(0);
    let network_count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM network_summaries").fetch_one(&state.pg).await.unwrap_or(0);
    Json(json!({ "status": "ok", "tables": { "probe_reports": probe_count, "assets": asset_count, "network_summaries": network_count } }))
}

pub async fn debug_mongo(State(state): State<Arc<AppState>>) -> Json<Value> {
    let hw = state.mongo.collection::<mongodb::bson::Document>("hardware_snapshots").count_documents(doc! {}).await.unwrap_or(0);
    let net = state.mongo.collection::<mongodb::bson::Document>("diagnostic_events").count_documents(doc! {}).await.unwrap_or(0);
    Json(json!({ "status": "ok", "collections": { "hardware_snapshots": hw, "diagnostic_events": net } }))
}

pub async fn debug_redis(State(state): State<Arc<AppState>>) -> Json<Value> {
    match with_redis(state.redis.clone(), |conn| {
        let pong: String = redis::cmd("PING").query(conn)?;
        let keys: Vec<String> = redis::cmd("KEYS").arg("alerts:*").query(conn).unwrap_or_default();
        Ok((pong, keys.len()))
    }).await {
        Ok((pong, count)) => Json(json!({ "status": "ok", "ping": pong, "active_alerts": count })),
        Err(e) => Json(json!({ "status": "error", "message": e.to_string() })),
    }
}
