use axum::{body::Body, extract::State, http::StatusCode, response::Response};
use axum::extract::Request;
use std::sync::Arc;
use tracing::error;
use crate::state::AppState;

pub async fn proxy_catalogue(
    State(state): State<Arc<AppState>>,
    req: Request<Body>,
) -> Result<Response<Body>, StatusCode> {
    let uri = req.uri();
    let path_and_query = uri.path_and_query()
        .map(|pq| pq.as_str())
        .unwrap_or("/");
    let upstream_url = format!("{}{}", state.catalogue_url, path_and_query);

    let method = reqwest::Method::from_bytes(req.method().as_str().as_bytes())
        .map_err(|_| StatusCode::METHOD_NOT_ALLOWED)?;

    let mut builder = state.ml.request(method, &upstream_url);
    // Extract token from cookie to forward as Authorization header to catalogue
    let cookie_token: Option<String> = req.headers().get("cookie")
        .and_then(|v| v.to_str().ok())
        .and_then(|s| s.split(';').find_map(|p| {
            let p = p.trim();
            p.strip_prefix("nextbit_token=").map(|v| v.to_string())
        }));
    for (name, value) in req.headers().iter() {
        if name == "host" || name == "content-length" { continue; }
        builder = builder.header(name, value);
    }
    if let Some(token) = cookie_token {
        builder = builder.header("Authorization", format!("Bearer {}", token));
    }

    // Fix: use axum's body bytes correctly
    let body_bytes = axum::body::to_bytes(req.into_body(), usize::MAX)
        .await
        .map_err(|_| StatusCode::BAD_REQUEST)?;

    if !body_bytes.is_empty() {
        builder = builder.body(body_bytes);
    }

    let response = builder.send().await.map_err(|e| {
        error!("Catalogue proxy error: {}", e);
        StatusCode::BAD_GATEWAY
    })?;

    let mut rb = Response::builder().status(response.status());
    for (name, value) in response.headers().iter() {
        if name == "content-length" || name == "transfer-encoding" || name == "content-encoding" { continue; }
        rb = rb.header(name, value);
    }

    let body = response.bytes().await.map_err(|_| StatusCode::BAD_GATEWAY)?;
    rb.body(Body::from(body)).map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)
}

pub async fn ml_forecast(
    State(state): State<Arc<AppState>>,
    axum::Json(body): axum::Json<serde_json::Value>,
) -> Result<axum::Json<serde_json::Value>, (StatusCode, axum::Json<serde_json::Value>)> {
    let url = format!("{}/api/v1/market/forecast", state.ml_url);  // ← use state
    let response = state.ml
        .post(&url)
        .header("X-Internal-Key", &state.internal_api_key)
        .json(&body).send().await
        .map_err(|e| (StatusCode::BAD_GATEWAY, axum::Json(serde_json::json!({ "error": e.to_string() }))))?;
    let result: serde_json::Value = response.json().await
        .map_err(|e| (StatusCode::BAD_GATEWAY, axum::Json(serde_json::json!({ "error": e.to_string() }))))?;
    Ok(axum::Json(result))
}

pub async fn ml_hardware(
    State(state): State<Arc<AppState>>,
    axum::Json(body): axum::Json<serde_json::Value>,
) -> Result<axum::Json<serde_json::Value>, (StatusCode, axum::Json<serde_json::Value>)> {
    let url = format!("{}/api/v1/hardware/analyze", state.ml_url);  // ← use state
    let response = state.ml
        .post(&url)
        .header("X-Internal-Key", &state.internal_api_key)
        .json(&body).send().await
        .map_err(|e| (StatusCode::BAD_GATEWAY, axum::Json(serde_json::json!({ "error": e.to_string() }))))?;
    let result: serde_json::Value = response.json().await
        .map_err(|e| (StatusCode::BAD_GATEWAY, axum::Json(serde_json::json!({ "error": e.to_string() }))))?;
    Ok(axum::Json(result))
}

pub async fn forward_to_fastapi(
    client: &reqwest::Client,
    base_url: &str,
    method: &str,
    path: &str,
    body: Option<serde_json::Value>,
) -> Result<serde_json::Value, reqwest::Error> {
    let url = format!("{}{}", base_url, path);
    let req = match method {
        "POST" => client.post(&url).json(&body),
        _ => client.get(&url),
    };
    req.send().await?.json().await
}
