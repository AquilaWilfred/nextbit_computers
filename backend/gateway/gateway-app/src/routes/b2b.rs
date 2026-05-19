use axum::{
    Router,
    routing::{get, post},
    extract::{Multipart, Path, State, Extension},
    response::{IntoResponse, Response},
    http::StatusCode,
    Json,
};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use uuid::Uuid;
use std::{collections::HashMap, sync::Arc};

use crate::{
    state::AppState,
    models::Claims,
    middleware::auth::require_auth,
};

// ── Public B2B router ─────────────────────────────────────────────────────────

pub fn b2b_router(state: Arc<AppState>) -> Router<Arc<AppState>> {
    Router::new()
        .route("/summary",          get(proxy_get))
        .route("/lpos",             get(proxy_get).post(proxy_post))
        .route("/lpos/:id/pdf",     get(proxy_get))
        .route("/lpos/:id/approve", post(proxy_post))
        .route("/suppliers",        get(proxy_get))
        .route("/statement",        get(proxy_get))
        .route("/reports/:kind",    get(proxy_get))
        .route_layer(axum::middleware::from_fn_with_state(
            state,
            require_auth,
        ))
        // /register is outside the route_layer — unauthenticated
        .route("/register", post(register_handler))
}

// ── Admin B2B router ──────────────────────────────────────────────────────────

pub fn admin_b2b_router(state: Arc<AppState>) -> Router<Arc<AppState>> {
    Router::new()
        .route("/applications",                           get(admin_list_applications))
        .route("/applications/:id/status",                post(admin_update_status))
        .route("/applications/:id/documents/:key/verify", post(admin_verify_document))
        .route_layer(axum::middleware::from_fn_with_state(
            state,
            require_auth,
        ))
}

// ── Registration (unauthenticated) ────────────────────────────────────────────

#[derive(Serialize)]
struct RegisterResponse {
    reference_number: String,
}

async fn register_handler(
    State(state): State<Arc<AppState>>,
    mut multipart: Multipart,
) -> Result<Json<RegisterResponse>, (StatusCode, Json<Value>)> {
    let mut company_info:    Option<Value>           = None;
    let mut primary_contact: Option<Value>           = None;
    let mut finance_contact: Option<Value>           = None;
    let mut document_urls:   HashMap<String, String> = HashMap::new();

    while let Some(field) = multipart
        .next_field()
        .await
        .map_err(|e| (StatusCode::BAD_REQUEST, Json(json!({ "error": e.to_string() }))))?
    {
        let name         = field.name().unwrap_or("").to_string();
        let content_type = field.content_type().map(|s| s.to_string());
        let data         = field
            .bytes()
            .await
            .map_err(|e| (StatusCode::BAD_REQUEST, Json(json!({ "error": e.to_string() }))))?;

        match name.as_str() {
            "companyInfo"    => { company_info    = serde_json::from_slice(&data).ok(); }
            "primaryContact" => { primary_contact = serde_json::from_slice(&data).ok(); }
            "financeContact" => { finance_contact = serde_json::from_slice(&data).ok(); }
            key if key.starts_with("doc_") => {
                let doc_key = key.trim_start_matches("doc_").to_string();
                let ext = content_type.as_deref()
                    .map(|ct| if ct.contains("pdf") { "pdf" }
                              else if ct.contains("png") { "png" }
                              else { "jpg" })
                    .unwrap_or("bin");
                let placeholder = format!(
                    "pending-upload/{}/{}.{}",
                    Uuid::new_v4(),
                    doc_key,
                    ext,
                );
                document_urls.insert(doc_key, placeholder);
            }
            _ => {}
        }
    }

    let payload = json!({
        "companyInfo":    company_info,
        "primaryContact": primary_contact,
        "financeContact": finance_contact,
        "documentUrls":   document_urls,
    });

    let res = state
        .ml
        .post(format!("{}/api/b2b/register", state.catalogue_url))
        .json(&payload)
        .send()
        .await
        .map_err(|e| (StatusCode::BAD_GATEWAY, Json(json!({ "error": e.to_string() }))))?;

    let body: Value = res
        .json()
        .await
        .map_err(|e| (StatusCode::BAD_GATEWAY, Json(json!({ "error": e.to_string() }))))?;

    let reference_number = body["referenceNumber"]
        .as_str()
        .unwrap_or("NB-ERROR")
        .to_string();

    Ok(Json(RegisterResponse { reference_number }))
}

// ── Generic proxy helpers ─────────────────────────────────────────────────────
// Strip /api/b2b from the front of the URI so we don't double-prefix it when
// forwarding to catalogue (which mounts its router at /api/b2b already).
// Forward the verified user email so catalogue's get_current_user_optional
// can identify the caller via the Authorization header injected by require_auth.

async fn proxy_get(
    State(state): State<Arc<AppState>>,
    Extension(claims): Extension<Claims>,
    req: axum::extract::Request,
) -> impl IntoResponse {
    let uri = req.uri();
    let full_path = uri.path();
    // Strip both /api/b2b and /api/admin/b2b prefixes cleanly
    let path = full_path
        .trim_start_matches("/api/admin/b2b")
        .trim_start_matches("/api/b2b");
    let query = uri.query().map(|q| format!("?{}", q)).unwrap_or_default();
    let url = format!("{}/api/b2b{}{}", state.catalogue_url, path, query);

    proxy_request_with_auth(&state.ml, "GET", &url, None, &claims.sub).await
}

async fn proxy_post(
    State(state): State<Arc<AppState>>,
    Extension(claims): Extension<Claims>,
    req: axum::extract::Request,
) -> impl IntoResponse {
    let uri   = req.uri().clone();
    let full_path = uri.path();
    let path = full_path
        .trim_start_matches("/api/admin/b2b")
        .trim_start_matches("/api/b2b");
    let query = uri.query().map(|q| format!("?{}", q)).unwrap_or_default();
    let url   = format!("{}/api/b2b{}{}", state.catalogue_url, path, query);
    let body  = axum::body::to_bytes(req.into_body(), usize::MAX)
        .await
        .unwrap_or_default();
    proxy_request_with_auth_raw(&state.ml, "POST", &url, Some(body), &claims.sub).await
}

// ── Admin handlers ────────────────────────────────────────────────────────────

async fn admin_list_applications(
    State(state): State<Arc<AppState>>,
    Extension(claims): Extension<Claims>,
) -> impl IntoResponse {
    if claims.role.as_deref() != Some("admin") {
        return (StatusCode::FORBIDDEN, Json(json!({ "error": "admin only" }))).into_response();
    }
    proxy_request_with_auth(
        &state.ml,
        "GET",
        &format!("{}/api/admin/b2b/applications", state.catalogue_url),
        None,
        &claims.sub,
    ).await
}

#[derive(Deserialize)]
struct StatusUpdate {
    status:        String,
    notes:         Option<String>,
    credit_limit:  Option<i64>,
    payment_terms: Option<String>,
}

async fn admin_update_status(
    State(state): State<Arc<AppState>>,
    Path(id): Path<String>,
    Extension(claims): Extension<Claims>,
    Json(body): Json<StatusUpdate>,
) -> impl IntoResponse {
    if claims.role.as_deref() != Some("admin") {
        return (StatusCode::FORBIDDEN, Json(json!({ "error": "admin only" }))).into_response();
    }
    let payload = json!({
        "status":       body.status,
        "notes":        body.notes,
        "creditLimit":  body.credit_limit,
        "paymentTerms": body.payment_terms,
        "reviewedBy":   claims.sub,
    });
    proxy_request_with_auth(
        &state.ml,
        "POST",
        &format!("{}/api/admin/b2b/applications/{}/status", state.catalogue_url, id),
        Some(payload),
        &claims.sub,
    ).await
}

#[derive(Deserialize)]
struct VerifyDoc {
    verified: bool,
}

async fn admin_verify_document(
    State(state): State<Arc<AppState>>,
    Path((id, key)): Path<(String, String)>,
    Extension(claims): Extension<Claims>,
    Json(body): Json<VerifyDoc>,
) -> impl IntoResponse {
    if claims.role.as_deref() != Some("admin") {
        return (StatusCode::FORBIDDEN, Json(json!({ "error": "admin only" }))).into_response();
    }
    let payload = json!({
        "verified":   body.verified,
        "verifiedBy": claims.sub,
    });
    proxy_request_with_auth(
        &state.ml,
        "POST",
        &format!(
            "{}/api/admin/b2b/applications/{}/documents/{}/verify",
            state.catalogue_url, id, key
        ),
        Some(payload),
        &claims.sub,
    ).await
}

// ── Internal proxy helper ─────────────────────────────────────────────────────
// Forwards the verified user's email as Authorization: Bearer so catalogue's
// get_current_user_optional can look them up via verify_token → db.query(User).

async fn proxy_request_with_auth(
    client: &reqwest::Client,
    method: &str,
    url: &str,
    body: Option<Value>,
    user_email: &str,
) -> Response {
    let raw = body.as_ref().map(|b| serde_json::to_vec(b).unwrap_or_default());
    proxy_request_with_auth_raw(client, method, url, raw.map(bytes::Bytes::from), user_email).await
}

async fn proxy_request_with_auth_raw(
    client: &reqwest::Client,
    method: &str,
    url: &str,
    body: Option<bytes::Bytes>,
    user_email: &str,
) -> Response {
    let req = match method {
        "POST" => client.post(url),
        "PUT"  => client.put(url),
        _      => client.get(url),
    };
    let req = req.header("X-User-Email", user_email);
    let req = if let Some(b) = body {
        req.header("Content-Type", "application/json").body(b)
    } else {
        req
    };

    match req.send().await {
        Ok(res) => {
            let status = StatusCode::from_u16(res.status().as_u16())
                .unwrap_or(StatusCode::INTERNAL_SERVER_ERROR);
            let bytes = res.bytes().await.unwrap_or_default();
            (status, bytes).into_response()
        }
        Err(e) => (
            StatusCode::BAD_GATEWAY,
            Json(json!({ "error": e.to_string() })),
        ).into_response(),
    }
}