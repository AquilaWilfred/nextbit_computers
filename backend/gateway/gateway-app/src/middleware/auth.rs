use axum::{
    body::Body,
    extract::{Request, State},
    http::StatusCode,
    middleware::Next,
    response::{Json, Response},
};
use serde_json::json;
use std::sync::Arc;
use crate::{auth::verify_jwt, state::AppState};

fn extract_token(req: &Request<Body>) -> Option<String> {
    // 1. Try HttpOnly cookie first
    if let Some(cookie_header) = req.headers().get("cookie") {
        if let Ok(cookie_str) = cookie_header.to_str() {
            for part in cookie_str.split(';') {
                let part = part.trim();
                if let Some(val) = part.strip_prefix("nextbit_token=") {
                    if !val.is_empty() {
                        return Some(val.to_string());
                    }
                }
            }
        }
    }
    // 2. Fallback to Authorization: Bearer header (for API clients)
    req.headers()
        .get("Authorization")
        .and_then(|v| v.to_str().ok())
        .and_then(|v| v.strip_prefix("Bearer "))
        .map(|s| s.to_string())
}

pub async fn require_auth(
    State(_state): State<Arc<AppState>>,
    mut req: Request<Body>,
    next: Next,
) -> Result<Response, (StatusCode, Json<serde_json::Value>)> {
    let token = match extract_token(&req) {
        Some(t) => t,
        None => return Err((
            StatusCode::UNAUTHORIZED,
            Json(json!({ "error": "Authentication required" })),
        )),
    };

    let email = verify_jwt(&token).map_err(|_| (
        StatusCode::UNAUTHORIZED,
        Json(json!({ "error": "Invalid or expired token" })),
    ))?;

    // Insert Claims into request extensions so handlers can extract it
    req.extensions_mut().insert(crate::models::Claims {
        sub: email.clone(),
        exp: 0,
        role: None,
        company_id: None,
    });

    // Insert Claims into request extensions so handlers can extract it
    req.extensions_mut().insert(crate::models::Claims {
        sub: email.clone(),
        exp: 0,
        role: None,
        company_id: None,
    });

    // Forward verified identity to downstream services
    req.headers_mut().insert(
        "X-User-Email",
        email.parse().map_err(|_| (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "error": "Internal error" })),
        ))?,
    );
    // Also forward as Authorization header so catalogue HTTPBearer works
    req.headers_mut().insert(
        "Authorization",
        format!("Bearer {}", token).parse().map_err(|_| (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "error": "Internal error" })),
        ))?,
    );

    Ok(next.run(req).await)
}
