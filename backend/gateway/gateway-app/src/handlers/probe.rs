use axum::{extract::{Path, State}, http::StatusCode, Json};
use chrono::Utc;
use futures_util::TryStreamExt;
use mongodb::bson::{doc, Document};
use serde_json::{json, Value};
use std::sync::Arc;
use uuid::Uuid;
use crate::{models::{HardwareReport, NetworkReport}, models::probe::{ProbeSubmit, ProbeResponse}, redis_helpers::with_redis, services::{device::upsert_device, scan::insert_scan, mongo_scan::insert_scan_mongo}, state::AppState};
use tracing::{error, info};

fn db_error(db: &str, msg: String) -> (StatusCode, Json<Value>) {
    error!("{} error: {}", db, msg);
    (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({ "error": format!("{} error: {}", db, msg) })))
}

pub async fn submit_hardware(
    State(state): State<Arc<AppState>>,
    Json(body): Json<HardwareReport>,
) -> Result<(StatusCode, Json<Value>), (StatusCode, Json<Value>)> {
    let id = Uuid::new_v4();
    let now = Utc::now();

    sqlx::query("INSERT INTO probe_reports (id, device_id, submitted_at, payload) VALUES ($1, $2, $3, $4)")
        .bind(id).bind(&body.device_id).bind(now).bind(&body.hardware)
        .execute(&state.pg).await.map_err(|e| db_error("postgres", e.to_string()))?;

    let col = state.mongo.collection::<Document>("hardware_snapshots");
    let doc = doc! {
        "report_id": id.to_string(), "device_id": &body.device_id,
        "captured_at": now.to_rfc3339(),
        "hardware": mongodb::bson::to_bson(&body.hardware).map_err(|e| db_error("mongodb", e.to_string()))?,
    };
    col.insert_one(doc).await.map_err(|e| db_error("mongodb", e.to_string()))?;
    info!("Hardware report saved for device {}", body.device_id);

    Ok((StatusCode::CREATED, Json(json!({ "id": id, "device_id": body.device_id, "submitted_at": now.to_rfc3339() }))))
}

pub async fn submit_probe(
    State(state): State<Arc<AppState>>,
    Json(body): Json<ProbeSubmit>,
) -> Result<Json<ProbeResponse>, (StatusCode, Json<Value>)> {
    let shop_id = body.shop_id.unwrap_or_else(Uuid::new_v4);

    let device_result: Result<(crate::models::probe::Device, bool), Box<dyn std::error::Error>> = upsert_device(&state.pg, &body, shop_id).await;
    let (device, is_new_device) = device_result
        .map_err(|e| db_error("postgres", e.to_string()))?;

    let scan_id = Uuid::new_v4().to_string();
    let insert_scan_result: Result<_, Box<dyn std::error::Error>> = insert_scan(&state.pg, device.id, scan_id.clone(), serde_json::to_value(&body).map_err(|e: serde_json::Error| db_error("postgres", e.to_string()))?)
        .await;
    insert_scan_result
        .map_err(|e| db_error("postgres", e.to_string()))?;

    let collection = state.mongo.collection::<Document>("scans");
    let mongo_body = serde_json::to_value(&body).map_err(|e: serde_json::Error| db_error("mongodb", e.to_string()))?;
    if let Err(e) = insert_scan_mongo(&collection, &device.device_id, &scan_id, mongo_body).await {
        error!("MongoDB insert failed, continuing without Mongo persistence: {}", e);
    }

    let response = ProbeResponse {
        device_id: device.device_id,
        scan_id,
        is_new_device,
    };

    Ok(Json(response))
}

pub async fn get_hardware_reports(
    State(state): State<Arc<AppState>>,
    Path(device_id): Path<String>,
) -> Result<Json<Value>, (StatusCode, Json<Value>)> {
    let rows = sqlx::query_as::<_, (Uuid, String, chrono::DateTime<Utc>, Value)>(
        "SELECT id, device_id, submitted_at, payload FROM probe_reports WHERE device_id = $1 ORDER BY submitted_at DESC"
    )
    .bind(&device_id).fetch_all(&state.pg).await
    .map_err(|e| db_error("postgres", e.to_string()))?;

    let reports: Vec<Value> = rows.into_iter().map(|(id, dev, ts, payload)| json!({
        "id": id, "device_id": dev, "submitted_at": ts.to_rfc3339(), "hardware": payload,
    })).collect();

    Ok(Json(json!({ "device_id": device_id, "reports": reports })))
}

pub async fn get_latest_hardware(
    State(state): State<Arc<AppState>>,
    Path(device_id): Path<String>,
) -> Result<Json<Value>, (StatusCode, Json<Value>)> {
    let col = state.mongo.collection::<Document>("hardware_snapshots");
    let mut cursor = col.find(doc! { "device_id": &device_id })
        .sort(doc! { "captured_at": -1 }).limit(1).await
        .map_err(|e| db_error("mongodb", e.to_string()))?;

    if let Some(doc) = cursor.try_next().await.map_err(|e: mongodb::error::Error| db_error("mongodb", e.to_string()))? {
        Ok(Json(json!(mongodb::bson::to_bson(&doc).map_err(|e| db_error("mongodb", e.to_string()))?)))
    } else {
        Err((StatusCode::NOT_FOUND, Json(json!({ "error": "No snapshot found" }))))
    }
}

pub async fn submit_network(
    State(state): State<Arc<AppState>>,
    Json(body): Json<NetworkReport>,
) -> Result<(StatusCode, Json<Value>), (StatusCode, Json<Value>)> {
    let id = Uuid::new_v4();
    let now = Utc::now();
    let threat_count = body.summary.get("threat_hit_count").and_then(|v| v.as_i64()).unwrap_or(0) as i32;
    let total_connections = body.summary.get("total_connections").and_then(|v| v.as_i64()).unwrap_or(0) as i32;
    let total_flows = body.summary.get("total_flows").and_then(|v| v.as_i64()).unwrap_or(0) as i32;
    let total_bytes = body.summary.get("total_bytes").and_then(|v| v.as_i64()).unwrap_or(0);

    sqlx::query("INSERT INTO network_summaries (id, device_id, captured_at, total_connections, total_flows, total_bytes, threat_hit_count) VALUES ($1,$2,$3,$4,$5,$6,$7)")
        .bind(id).bind(&body.device_id).bind(now)
        .bind(total_connections).bind(total_flows).bind(total_bytes).bind(threat_count)
        .execute(&state.pg).await.map_err(|e| db_error("postgres", e.to_string()))?;

    let col = state.mongo.collection::<Document>("diagnostic_events");
    let doc = doc! {
        "report_id": id.to_string(), "device_id": &body.device_id,
        "captured_at": now.to_rfc3339(), "capture_duration": body.capture_duration as i64,
        "summary": mongodb::bson::to_bson(&body.summary).map_err(|e| db_error("mongodb", e.to_string()))?,
        "connections": mongodb::bson::to_bson(&body.connections).map_err(|e| db_error("mongodb", e.to_string()))?,
        "flows": mongodb::bson::to_bson(&body.flows).map_err(|e| db_error("mongodb", e.to_string()))?,
        "threat_hits": mongodb::bson::to_bson(&body.threat_hits).map_err(|e| db_error("mongodb", e.to_string()))?,
    };
    col.insert_one(doc).await.map_err(|e| db_error("mongodb", e.to_string()))?;

    let alert_queued = if threat_count > 0 {
        let alert = json!({ "device_id": body.device_id, "threat_hits": body.threat_hits, "queued_at": now.to_rfc3339() });
        let alert_str = serde_json::to_string(&alert).unwrap();
        let key = format!("alerts:{}", body.device_id);
        let redis_client = state.redis.clone();
        match with_redis(redis_client, move |conn| {
            redis::cmd("SETEX").arg(&key).arg(3600i64).arg(&alert_str).query::<()>(conn)
        }).await {
            Ok(_) => { info!("Threat alert queued for device {}", body.device_id); true }
            Err(e) => { error!("Redis error: {}", e); false }
        }
    } else { false };

    Ok((StatusCode::CREATED, Json(json!({ "id": id, "device_id": body.device_id, "threat_hits": threat_count, "alert_queued": alert_queued }))))
}

pub async fn get_network_reports(
    State(state): State<Arc<AppState>>,
    Path(device_id): Path<String>,
) -> Result<Json<Value>, (StatusCode, Json<Value>)> {
    let col = state.mongo.collection::<Document>("diagnostic_events");
    let mut cursor = col.find(doc! { "device_id": &device_id })
        .sort(doc! { "captured_at": -1 }).await
        .map_err(|e| db_error("mongodb", e.to_string()))?;

    let mut reports = Vec::new();
    while let Some(doc) = cursor.try_next().await.map_err(|e: mongodb::error::Error| db_error("mongodb", e.to_string()))? {
        reports.push(mongodb::bson::to_bson(&doc).map_err(|e| db_error("mongodb", e.to_string()))?);
    }
    Ok(Json(json!({ "device_id": device_id, "reports": reports })))
}
