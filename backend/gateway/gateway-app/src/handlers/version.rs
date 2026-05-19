use axum::Json;
use serde::Serialize;

#[derive(Serialize)]
pub struct VersionResponse {
    pub latest_version: String,
    pub download_url: Option<String>,
}

pub async fn get_version() -> Json<VersionResponse> {
    Json(VersionResponse {
        latest_version: "3.0.0".to_string(),
        download_url: Some("https://example.com/download".to_string()),
    })
}