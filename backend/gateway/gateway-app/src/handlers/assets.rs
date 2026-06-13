use axum::{extract::{Path, State}, http::StatusCode, Json};
use chrono::Utc;
use futures_util::TryStreamExt;
use mongodb::bson::{doc, Document};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::sync::Arc;
use uuid::Uuid;
use crate::{models::{AssetRequest, AssetUpdate}, redis_helpers::with_redis, state::AppState};
use tracing::error;

// ── Inline schemas ────────────────────────────────────────────────────────────

/// A registered asset record.
#[derive(Serialize, utoipa::ToSchema)]
pub struct AssetResponse {
    pub id: Uuid,
    pub device_id: String,
    pub label: Option<String>,
    pub owner: Option<String>,
    pub created_at: String,
}

/// List of assets.
#[derive(Serialize, utoipa::ToSchema)]
pub struct AssetListResponse {
    pub assets: Vec<AssetResponse>,
}

/// Returned after a successful update.
#[derive(Serialize, utoipa::ToSchema)]
pub struct AssetUpdatedResponse {
    pub updated: bool,
    pub device_id: String,
}

/// Returned after a successful delete.
#[derive(Serialize, utoipa::ToSchema)]
pub struct AssetDeletedResponse {
    pub deleted: bool,
    pub device_id: String,
}

/// Full device report combining Postgres, MongoDB and Redis data.
#[derive(Serialize, utoipa::ToSchema)]
pub struct FullReportResponse {
    pub device_id: String,
    /// Asset metadata from Postgres (null if not registered)
    pub asset: Option<Value>,
    /// Latest hardware snapshot from MongoDB
    pub latest_hardware: Option<Value>,
    /// Latest network/diagnostic snapshot from MongoDB
    pub latest_network: Option<Value>,
    /// Active alert from Redis (null if none)
    pub active_alert: Option<Value>,
}

/// Generic error body.
#[derive(Serialize, utoipa::ToSchema)]
pub struct AssetErrorResponse {
    pub error: String,
}

// ── Helpers ───────────────────────────────────────────────────────────────────

fn db_error(db: &str, msg: String) -> (StatusCode, Json<Value>) {
    error!("{} error: {}", db, msg);
    (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({ "error": format!("{} error: {}", db, msg) })))
}

// ── Handlers ──────────────────────────────────────────────────────────────────

/// Register a new asset (device → asset mapping).
///
/// Creates a new asset record linking a device ID to a label and owner.
/// Silently ignores duplicate `device_id` (ON CONFLICT DO NOTHING).
#[utoipa::path(
    post,
    path = "/api/assets",
    tag = "Assets",
    request_body(
        content = AssetRequest,
        description = "Asset registration payload",
        content_type = "application/json"
    ),
    responses(
        (status = 201, description = "Asset registered",        body = AssetResponse),
        (status = 500, description = "Database error",          body = AssetErrorResponse),
    ),
    security(("bearerAuth" = []))
)]
pub async fn register_asset(
    State(state): State<Arc<AppState>>,
    Json(body): Json<AssetRequest>,
) -> Result<(StatusCode, Json<Value>), (StatusCode, Json<Value>)> {
    let id = Uuid::new_v4();
    let now = Utc::now();
    sqlx::query("INSERT INTO assets (id, device_id, label, owner, created_at) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (device_id) DO NOTHING")
        .bind(id).bind(&body.device_id).bind(&body.label).bind(&body.owner).bind(now)
        .execute(&state.pg).await.map_err(|e| db_error("postgres", e.to_string()))?;
    Ok((StatusCode::CREATED, Json(json!({ "id": id, "device_id": body.device_id, "label": body.label, "owner": body.owner, "created_at": now.to_rfc3339() }))))
}

/// List all registered assets.
///
/// Returns all asset records ordered by registration time descending.
#[utoipa::path(
    get,
    path = "/api/assets",
    tag = "Assets",
    responses(
        (status = 200, description = "Asset list",    body = AssetListResponse),
        (status = 500, description = "Database error", body = AssetErrorResponse),
    ),
    security(("bearerAuth" = []))
)]
pub async fn list_assets(
    State(state): State<Arc<AppState>>,
) -> Result<Json<Value>, (StatusCode, Json<Value>)> {
    let rows = sqlx::query_as::<_, (Uuid, String, Option<String>, Option<String>, chrono::DateTime<Utc>)>(
        "SELECT id, device_id, label, owner, created_at FROM assets ORDER BY created_at DESC"
    ).fetch_all(&state.pg).await.map_err(|e| db_error("postgres", e.to_string()))?;

    let assets: Vec<Value> = rows.into_iter().map(|(id, device_id, label, owner, created_at)| json!({
        "id": id, "device_id": device_id, "label": label, "owner": owner, "created_at": created_at.to_rfc3339()
    })).collect();
    Ok(Json(json!({ "assets": assets })))
}

/// Get a single asset by device ID.
#[utoipa::path(
    get,
    path = "/api/assets/{device_id}",
    tag = "Assets",
    params(
        ("device_id" = String, Path, description = "Device ID of the asset to retrieve")
    ),
    responses(
        (status = 200, description = "Asset found",   body = AssetResponse),
        (status = 404, description = "Not found",     body = AssetErrorResponse),
        (status = 500, description = "Database error", body = AssetErrorResponse),
    ),
    security(("bearerAuth" = []))
)]
pub async fn get_asset(
    State(state): State<Arc<AppState>>,
    Path(device_id): Path<String>,
) -> Result<Json<Value>, (StatusCode, Json<Value>)> {
    let row = sqlx::query_as::<_, (Uuid, String, Option<String>, Option<String>, chrono::DateTime<Utc>)>(
        "SELECT id, device_id, label, owner, created_at FROM assets WHERE device_id = $1"
    ).bind(&device_id).fetch_optional(&state.pg).await.map_err(|e| db_error("postgres", e.to_string()))?;

    match row {
        Some((id, device_id, label, owner, created_at)) => Ok(Json(json!({
            "id": id, "device_id": device_id, "label": label, "owner": owner, "created_at": created_at.to_rfc3339()
        }))),
        None => Err((StatusCode::NOT_FOUND, Json(json!({ "error": "Asset not found" })))),
    }
}

/// Update an asset's label and/or owner.
///
/// Only fields provided in the body are updated; omitted fields are left unchanged.
#[utoipa::path(
    patch,
    path = "/api/assets/{device_id}",
    tag = "Assets",
    params(
        ("device_id" = String, Path, description = "Device ID of the asset to update")
    ),
    request_body(
        content = AssetUpdate,
        description = "Fields to update (all optional)",
        content_type = "application/json"
    ),
    responses(
        (status = 200, description = "Asset updated",  body = AssetUpdatedResponse),
        (status = 500, description = "Database error", body = AssetErrorResponse),
    ),
    security(("bearerAuth" = []))
)]
pub async fn update_asset(
    State(state): State<Arc<AppState>>,
    Path(device_id): Path<String>,
    Json(body): Json<AssetUpdate>,
) -> Result<Json<Value>, (StatusCode, Json<Value>)> {
    sqlx::query("UPDATE assets SET label = COALESCE($1, label), owner = COALESCE($2, owner) WHERE device_id = $3")
        .bind(&body.label).bind(&body.owner).bind(&device_id)
        .execute(&state.pg).await.map_err(|e| db_error("postgres", e.to_string()))?;
    Ok(Json(json!({ "updated": true, "device_id": device_id })))
}

/// Delete an asset by device ID.
#[utoipa::path(
    delete,
    path = "/api/assets/{device_id}",
    tag = "Assets",
    params(
        ("device_id" = String, Path, description = "Device ID of the asset to delete")
    ),
    responses(
        (status = 200, description = "Asset deleted",  body = AssetDeletedResponse),
        (status = 500, description = "Database error", body = AssetErrorResponse),
    ),
    security(("bearerAuth" = []))
)]
pub async fn delete_asset(
    State(state): State<Arc<AppState>>,
    Path(device_id): Path<String>,
) -> Result<Json<Value>, (StatusCode, Json<Value>)> {
    sqlx::query("DELETE FROM assets WHERE device_id = $1")
        .bind(&device_id).execute(&state.pg).await
        .map_err(|e| db_error("postgres", e.to_string()))?;
    Ok(Json(json!({ "deleted": true, "device_id": device_id })))
}

/// Get the full report for a device.
///
/// Aggregates data from three sources:
/// - **Postgres** — asset registration metadata
/// - **MongoDB** — latest hardware snapshot and latest network/diagnostic event
/// - **Redis** — active alert if any
#[utoipa::path(
    get,
    path = "/api/assets/{device_id}/report",
    tag = "Assets",
    params(
        ("device_id" = String, Path, description = "Device ID to build the report for")
    ),
    responses(
        (status = 200, description = "Full device report",  body = FullReportResponse),
        (status = 500, description = "Database/cache error", body = AssetErrorResponse),
    ),
    security(("bearerAuth" = []))
)]
pub async fn get_full_report(
    State(state): State<Arc<AppState>>,
    Path(device_id): Path<String>,
) -> Result<Json<Value>, (StatusCode, Json<Value>)> {
    let asset = sqlx::query_as::<_, (Uuid, String, Option<String>, Option<String>, chrono::DateTime<Utc>)>(
        "SELECT id, device_id, label, owner, created_at FROM assets WHERE device_id = $1"
    ).bind(&device_id).fetch_optional(&state.pg).await
    .map_err(|e| db_error("postgres", e.to_string()))?
    .map(|(id, did, label, owner, created_at)| json!({ "id": id, "device_id": did, "label": label, "owner": owner, "created_at": created_at.to_rfc3339() }));

    let hw_col = state.mongo.collection::<Document>("hardware_snapshots");
    let mut hw_cursor = hw_col.find(doc! { "device_id": &device_id })
        .sort(doc! { "captured_at": -1 }).limit(1).await
        .map_err(|e| db_error("mongodb", e.to_string()))?;
    let latest_hardware = if let Some(doc) = hw_cursor.try_next().await
        .map_err(|e: mongodb::error::Error| db_error("mongodb", e.to_string()))? {
        mongodb::bson::to_bson(&doc).ok().map(|b| json!(b))
    } else { None };

    let net_col = state.mongo.collection::<Document>("diagnostic_events");
    let mut net_cursor = net_col.find(doc! { "device_id": &device_id })
        .sort(doc! { "captured_at": -1 }).limit(1).await
        .map_err(|e| db_error("mongodb", e.to_string()))?;
    let latest_network = if let Some(doc) = net_cursor.try_next().await
        .map_err(|e: mongodb::error::Error| db_error("mongodb", e.to_string()))? {
        mongodb::bson::to_bson(&doc).ok().map(|b| json!(b))
    } else { None };

    let redis_client = state.redis.clone();
    let device_id_clone = device_id.clone();
    let alert = with_redis(redis_client, move |conn| {
        let key = format!("alerts:{}", device_id_clone);
        let val: Option<String> = redis::Commands::get(conn, &key).unwrap_or(None);
        Ok(val.and_then(|s| serde_json::from_str::<Value>(&s).ok()))
    }).await.unwrap_or(None);

    Ok(Json(json!({ "device_id": device_id, "asset": asset, "latest_hardware": latest_hardware, "latest_network": latest_network, "active_alert": alert })))
}