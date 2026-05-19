use axum::{extract::State, http::StatusCode, Json};
use crate::models::probe::{ProbeSubmit, ProbeResponse};
use crate::services::{device::upsert_device, scan::insert_scan, mongo_scan::insert_scan_mongo};
use crate::state::AppState;
use uuid::Uuid;

pub async fn submit_probe(
    State(state): State<AppState>,
    Json(probe): Json<ProbeSubmit>,
) -> Result<Json<ProbeResponse>, StatusCode> {
    // TODO: Validate owner key from headers
    // For now, assume shop_id is provided or default

    let shop_id = probe.shop_id.unwrap_or(Uuid::new_v4()); // Placeholder

    // Upsert device
    let (device, is_new) = upsert_device(&state.pool, &probe, shop_id)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    // Generate scan_id
    let scan_id = Uuid::new_v4().to_string();

    // Insert scan to Neon
    let _scan = insert_scan(&state.pool, device.id, scan_id.clone(), serde_json::to_value(&probe).unwrap())
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    // Insert to MongoDB
    if let Some(mongo) = &state.mongo {
        let collection = mongo.database("nextbit").collection::<serde_json::Value>("scans");
        insert_scan_mongo(&collection, &device.device_id, &scan_id, serde_json::to_value(&probe).unwrap())
            .await
            .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    }

    let response = ProbeResponse {
        device_id: device.device_id,
        scan_id,
        is_new_device: is_new,
    };

    Ok(Json(response))
}