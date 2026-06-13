use axum::Json;
use serde::Serialize;

#[derive(Serialize, utoipa::ToSchema)]
pub struct VersionResponse {
    pub latest_version: String,
    pub download_url: Option<String>,
}

/// Get the latest probe agent version and download URL.
#[utoipa::path(
    get,
    path = "/api/probe/version",
    responses(
        (status = 200, description = "Latest probe version info", body = VersionResponse),
    ),
    tag = "Probe"
)]
pub async fn get_version() -> Json<VersionResponse> {
    Json(VersionResponse {
        latest_version: "3.0.0".to_string(),
        download_url: Some("https://nextbit-probe-site.vercel.app/downloads".to_string()),
    })
}