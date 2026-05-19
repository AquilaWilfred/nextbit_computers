use axum::{
    body::Body,
    extract::State,
    http::{StatusCode, header::{SET_COOKIE, HeaderValue}},
    response::Response,
    Json,
};
use std::sync::Arc;
use crate::{models::{LoginRequest, RegisterRequest}, state::AppState};

/// Call catalogue, extract access_token, set HttpOnly cookie, return user only.
async fn proxy_auth_and_set_cookie(
    state: &Arc<AppState>,
    path: &str,
    body: serde_json::Value,
) -> Result<Response<Body>, StatusCode> {
    let url = format!("{}{}", state.catalogue_url, path);

    let client = reqwest::Client::new();
    let resp = client
        .post(&url)
        .json(&body)
        .send()
        .await
        .map_err(|e| {
            tracing::error!("Catalogue auth proxy error: {}", e);
            StatusCode::BAD_GATEWAY
        })?;

    let status = resp.status();
    if !status.is_success() {
        let bytes = resp.bytes().await.map_err(|_| StatusCode::BAD_GATEWAY)?;
        return Response::builder()
            .status(status.as_u16())
            .header("Content-Type", "application/json")
            .body(Body::from(bytes))
            .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR);
    }

    let payload: serde_json::Value = resp.json().await.map_err(|_| StatusCode::BAD_GATEWAY)?;

    let token = payload
        .get("access_token")
        .and_then(|t| t.as_str())
        .ok_or(StatusCode::BAD_GATEWAY)?;

    let cookie = format!(
        "nextbit_token={}; HttpOnly; SameSite=Lax; Path=/; Max-Age=1800",
        token
    );

    let user = payload.get("user").cloned().unwrap_or(serde_json::Value::Null);
    let response_body = serde_json::json!({ "user": user });

    Response::builder()
        .status(StatusCode::OK)
        .header(SET_COOKIE, HeaderValue::from_str(&cookie).unwrap())
        // ✅ second cookie — JS-readable, for WebSocket auth
        .header(SET_COOKIE, HeaderValue::from_str(
            &format!("nextbit_ws_token={}; SameSite=Lax; Path=/; Max-Age=1800", token)
        ).unwrap())
        .header("Content-Type", "application/json")
        .body(Body::from(serde_json::to_string(&response_body).unwrap()))
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)
}

pub async fn login(
    State(state): State<Arc<AppState>>,
    Json(req): Json<LoginRequest>,
) -> Result<Response<Body>, StatusCode> {
    proxy_auth_and_set_cookie(
        &state,
        "/api/auth/login",
        serde_json::json!({ "email": req.email, "password": req.password }),
    ).await
}

pub async fn register(
    State(state): State<Arc<AppState>>,
    Json(req): Json<RegisterRequest>,
) -> Result<Response<Body>, StatusCode> {
    proxy_auth_and_set_cookie(
        &state,
        "/api/auth/register",
        serde_json::json!({ "email": req.email, "password": req.password, "name": req.name }),
    ).await
}

pub async fn logout() -> Response<Body> {
    let clear_cookie = "nextbit_token=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0";
    let clear_ws_cookie = "nextbit_ws_token=; SameSite=Strict; Path=/; Max-Age=0";
    Response::builder()
        .status(StatusCode::OK)
        .header(SET_COOKIE, HeaderValue::from_str(clear_cookie).unwrap())
        .header(SET_COOKIE, HeaderValue::from_str(clear_ws_cookie).unwrap())
        .header("Content-Type", "application/json")
        .body(Body::from(r#"{"message":"Logged out"}"#))
        .unwrap()
}
