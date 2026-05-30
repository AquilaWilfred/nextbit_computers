mod auth;
mod handlers;
mod middleware;
mod models;
mod redis_helpers;
mod services;
mod state;
mod routes;
mod daraja;
mod daraja_escrow;

use anyhow::Result;
use axum::routing::{any, delete, get, patch, post};
use axum::Router;
use mongodb::Client as MongoClient;
use redis::Client as RedisClient;
use sqlx::PgPool;
use std::sync::Arc;
use tracing::info;
use hyper::header::{HeaderValue, AUTHORIZATION, CONTENT_TYPE, ACCEPT, COOKIE};
use tower_http::{cors::CorsLayer, trace::TraceLayer};

use handlers::{alerts, assets, escrow as escrow_handlers, debug, device, health, probe, proxy, scan, version, ws, ws_technician};
use redis_helpers::with_redis;
use state::AppState;

#[tokio::main]
async fn main() -> Result<()> {
    dotenvy::from_path(
        std::path::Path::new(env!("CARGO_MANIFEST_DIR"))
            .parent()
            .unwrap()
            .join(".env")
    ).expect("Failed to load .env");

    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| tracing_subscriber::EnvFilter::new("info"))
        )
        .init();

    info!("NextBit Gateway starting...");

    let http_client = reqwest::Client::new();
    let ml = http_client.clone();
    info!("HTTP client ready");

    let pg = PgPool::connect(&std::env::var("DATABASE_URL").expect("DATABASE_URL not set")).await?;
    info!("Postgres connected");
    sqlx::migrate!("./migrations").run(&pg).await?;
    info!("Postgres schema ready");

    let mongo_client = MongoClient::with_uri_str(&std::env::var("MONGO_URL").expect("MONGO_URL not set")).await?;
    let mongo = mongo_client.database("nextbit");
    info!("MongoDB connected");

    let redis_url = std::env::var("REDIS_URL").expect("REDIS_URL not set");
    let redis = Arc::new(RedisClient::open(redis_url.as_str())?);
    with_redis(redis.clone(), |conn| {
        let _: String = redis::cmd("PING").query(conn)?;
        Ok(())
    }).await?;
    info!("Redis connected");

    let catalogue_url = std::env::var("CATALOGUE_URL")
        .unwrap_or_else(|_| "http://localhost:8001".to_string());
    let ml_url = std::env::var("ML_URL")
        .unwrap_or_else(|_| "http://localhost:8000".to_string());

    let flw_client_id     = std::env::var("FLW_CLIENT_ID").expect("FLW_CLIENT_ID not set");
    let flw_client_secret = std::env::var("FLW_CLIENT_SECRET").expect("FLW_CLIENT_SECRET not set");
    let flw_token_url     = std::env::var("FLW_TOKEN_URL")
        .unwrap_or_else(|_| "https://idp.flutterwave.com/realms/flutterwave/protocol/openid-connect/token".to_string());
    let flw_api_base      = std::env::var("FLW_API_BASE")
        .unwrap_or_else(|_| "https://api.flutterwave.com".to_string());
    let flw_webhook_secret = std::env::var("FLW_WEBHOOK_SECRET")
        .unwrap_or_else(|_| "nextbit_webhook_2026".to_string());

    let flutterwave = crate::services::flutterwave::FlutterwaveClient::new(
        http_client.clone(),
        flw_client_id,
        flw_client_secret,
        flw_token_url,
        flw_api_base,
        flw_webhook_secret,
    );

    let daraja_base_url = std::env::var("DARAJA_BASE_URL")
        .unwrap_or_else(|_| "https://sandbox.safaricom.co.ke".to_string());
    let daraja_consumer_key = std::env::var("DARAJA_CONSUMER_KEY")
        .expect("DARAJA_CONSUMER_KEY not set");
    let daraja_consumer_secret = std::env::var("DARAJA_CONSUMER_SECRET")
        .expect("DARAJA_CONSUMER_SECRET not set");
    let daraja_shortcode = std::env::var("DARAJA_SHORTCODE")
        .expect("DARAJA_SHORTCODE not set");
    let daraja_b2c_shortcode = std::env::var("DARAJA_B2C_SHORTCODE")
        .unwrap_or_else(|_| daraja_shortcode.clone());
    let daraja_initiator_name = std::env::var("DARAJA_INITIATOR_NAME")
        .expect("DARAJA_INITIATOR_NAME not set");
    let daraja_security_credential = std::env::var("DARAJA_SECURITY_CREDENTIAL")
        .expect("DARAJA_SECURITY_CREDENTIAL not set");
    let daraja_passkey = std::env::var("DARAJA_PASSKEY")
        .expect("DARAJA_PASSKEY not set");
    let daraja_callback_base = std::env::var("DARAJA_CALLBACK_BASE")
        .expect("DARAJA_CALLBACK_BASE not set");

    let daraja = crate::daraja::DarajaClient::new(
        http_client.clone(),
        daraja_consumer_key,
        daraja_consumer_secret,
        daraja_base_url,
        daraja_shortcode,
        daraja_b2c_shortcode,
        daraja_initiator_name,
        daraja_security_credential,
        daraja_passkey,
        daraja_callback_base,
    );

    let internal_api_key = std::env::var("INTERNAL_API_KEY")
        .unwrap_or_else(|_| "nextbit_internal_secret_2026".to_string());

    let state = Arc::new(AppState { pg, mongo, redis, ml, http_client, flutterwave, daraja, catalogue_url, ml_url, internal_api_key });

    
    // ── Public routes (no auth required) ─────────────────────────────
    let public = Router::<Arc<AppState>>::new()
        .route("/health",                get(health::health_handler))
        .route("/api/auth",              any(proxy::proxy_catalogue))
        .route("/api/auth/*path",        any(proxy::proxy_catalogue))
        .route("/api/auth/login",        any(proxy::proxy_catalogue))
        .route("/api/auth/logout",       any(proxy::proxy_catalogue))
        .route("/api/auth/register",     any(proxy::proxy_catalogue))
        .route("/api/products",          any(proxy::proxy_catalogue))
        .route("/api/products/*path",    any(proxy::proxy_catalogue))
        .route("/api/categories",        any(proxy::proxy_catalogue))
        .route("/api/categories/*path",  any(proxy::proxy_catalogue))
        .route("/api/branches",          any(proxy::proxy_catalogue))
        .route("/api/branches/*path",    any(proxy::proxy_catalogue))
        .route("/api/settings",          any(proxy::proxy_catalogue))
        .route("/api/settings/*path",    any(proxy::proxy_catalogue))
        .route("/api/content",           any(proxy::proxy_catalogue))
        .route("/api/content/*path",     any(proxy::proxy_catalogue))
        .route("/api/ws/announcements",  get(ws::ws_announcements))
        .route("/api/settings/ws",       get(ws::ws_settings))
        .route("/api/probe/submit",      post(probe::submit_probe))
        .route("/api/probe/version",     get(version::get_version))
        .route("/api/devices",           get(device::get_all_devices))
        .route("/api/devices/:id",       get(device::get_device))
        .route("/api/devices/:id/scans", get(scan::get_device_scans))
        .route("/api/devices/:id/scans/:sid", get(scan::get_scan))
        .route("/api/webhooks/flutterwave", post(escrow_handlers::flutterwave_webhook));

    // ── Protected routes (JWT required) ──────────────────────────────
    let protected = Router::<Arc<AppState>>::new()
        .route("/api/auth/me",                           get(proxy::proxy_catalogue))
        .route("/api/orders",                            any(proxy::proxy_catalogue))
        .route("/api/orders/*path",                      any(proxy::proxy_catalogue))
        .route("/api/cart",                              any(proxy::proxy_catalogue))
        .route("/api/cart/*path",                        any(proxy::proxy_catalogue))
        .route("/api/addresses",                         any(proxy::proxy_catalogue))
        .route("/api/addresses/*path",                   any(proxy::proxy_catalogue))
        .route("/api/wishlist",                          any(proxy::proxy_catalogue))
        .route("/api/wishlist/*path",                    any(proxy::proxy_catalogue))
        .route("/api/delivery",                          any(proxy::proxy_catalogue))
        .route("/api/delivery/*path",                    any(proxy::proxy_catalogue))
        .route("/api/technician/ws/:user_id", get(ws_technician::proxy_ws_technician))
        .route("/api/admin/customers",                   any(proxy::proxy_catalogue))
        .route("/api/admin/customers/ws",                get(ws::ws_customers))
        .route("/api/ws/admin/stats",                    get(ws::ws_admin_stats))
        .route("/api/admin",                             any(proxy::proxy_catalogue))
        .route("/api/admin/*path",                       any(proxy::proxy_catalogue))
        .route("/api/probe/hardware",                    post(probe::submit_hardware))
        .route("/api/probe/hardware/{device_id}",        get(probe::get_hardware_reports))
        .route("/api/probe/hardware/{device_id}/latest", get(probe::get_latest_hardware))
        .route("/api/probe/network",                     post(probe::submit_network))
        .route("/api/probe/network/{device_id}",         get(probe::get_network_reports))
        .route("/api/alerts",                            get(alerts::get_alerts))
        .route("/api/assets",                            post(assets::register_asset))
        .route("/api/assets",                            get(assets::list_assets))
        .route("/api/assets/{device_id}",                get(assets::get_asset))
        .route("/api/assets/{device_id}",                patch(assets::update_asset))
        .route("/api/assets/{device_id}",                delete(assets::delete_asset))
        .route("/api/assets/{device_id}/report",         get(assets::get_full_report))
        .route("/api/ml/forecast",                       post(proxy::ml_forecast))
        .route("/api/ml/hardware",                       post(proxy::ml_hardware))
        .route("/api/escrow",                            post(escrow_handlers::create_escrow))
        .route("/api/escrow/:id",                        get(escrow_handlers::get_escrow))
        .route("/api/escrow/:id/initiate-payment", post(escrow_handlers::initiate_payment))
        .route("/api/escrow/:id/confirm-delivery",       post(escrow_handlers::confirm_delivery))
        .route("/api/escrow/:id/dispute",                post(escrow_handlers::raise_dispute))
        .route("/api/escrow/:id/admin-ruling",           post(escrow_handlers::admin_ruling))
        .merge(routes::daraja_escrow::daraja_escrow_api_routes())
        .route_layer(axum::middleware::from_fn_with_state(
            state.clone(),
            middleware::auth::require_auth,
        ));

    // ── Debug routes (internal only) ──────────────────────────────────
    let debug_routes = Router::new()
        .route("/debug/postgres", get(debug::debug_postgres))
        .route("/debug/mongo",    get(debug::debug_mongo))
        .route("/debug/redis",    get(debug::debug_redis));

    let app = Router::new()
        .nest("/api/b2b",       routes::b2b::b2b_router(state.clone()))
        .nest("/api/admin/b2b", routes::b2b::admin_b2b_router(state.clone()))
        .merge(routes::daraja_escrow::daraja_callback_routes())
        .merge(public)
        .merge(protected)
        .merge(debug_routes)
        .with_state(state)
        .layer(
            CorsLayer::new()
                .allow_origin("http://localhost:3000".parse::<HeaderValue>().unwrap())
                .allow_methods([
                    axum::http::Method::GET,
                    axum::http::Method::POST,
                    axum::http::Method::PUT,
                    axum::http::Method::PATCH,
                    axum::http::Method::DELETE,
                    axum::http::Method::OPTIONS,
                ])
                .allow_headers([AUTHORIZATION, CONTENT_TYPE, ACCEPT, COOKIE])
                .allow_credentials(true)
        )
        .layer(TraceLayer::new_for_http());

    let port = std::env::var("GATEWAY_PORT").unwrap_or_else(|_| "8080".to_string());
    let addr = format!("0.0.0.0:{}", port);
    let listener = tokio::net::TcpListener::bind(&addr).await?;
    info!("Gateway listening on {}", addr);
    axum::serve(listener, app).await?;
    Ok(())
}