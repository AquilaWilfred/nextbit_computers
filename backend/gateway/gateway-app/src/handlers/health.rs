use axum::{extract::State, Json};
use mongodb::bson::doc;
use serde_json::{json, Value};
use std::sync::Arc;
use crate::{redis_helpers::with_redis, state::AppState};

pub async fn health_handler(State(state): State<Arc<AppState>>) -> Json<Value> {
    let pg_status = match sqlx::query("SELECT 1").execute(&state.pg).await {
        Ok(_) => "connected", Err(_) => "error",
    };
    let mongo_status = match state.mongo.run_command(doc! { "ping": 1 }).await {
        Ok(_) => "connected", Err(_) => "error",
    };
    let redis_status = match with_redis(state.redis.clone(), |conn| {
        let _: String = redis::cmd("PING").query(conn)?; Ok(())
    }).await {
        Ok(_) => "connected", Err(_) => "error",
    };
    Json(json!({ "status": "ok", "postgres": pg_status, "mongodb": mongo_status, "redis": redis_status }))
}
