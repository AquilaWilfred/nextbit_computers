use axum::{
    extract::{State, WebSocketUpgrade},
    extract::ws::{WebSocket, Message as AMsg},
    response::Response,
};
use futures_util::{SinkExt, StreamExt};
use std::sync::Arc;
use serde_json::json;
use tracing::info;
use crate::state::AppState;
use tokio_tungstenite::tungstenite::Message as TMsg;
use tokio_tungstenite::MaybeTlsStream;
use tokio_tungstenite::WebSocketStream;
use tokio::net::TcpStream;

// ── Announcements ────────────────────────────────────────────────────────────

pub async fn ws_announcements(
    ws: WebSocketUpgrade,
    State(state): State<Arc<AppState>>,
) -> Response {
    ws.on_upgrade(move |socket| handle_announcements(socket, state))
}

async fn handle_announcements(mut socket: WebSocket, state: Arc<AppState>) {
    info!("WS announcements client connected");
    let announcements = fetch_announcements(&state).await;
    let msg = json!({ "type": "announcements", "data": announcements });
    if socket.send(AMsg::Text(msg.to_string().into())).await.is_err() {
        return;
    }
    let mut interval = tokio::time::interval(tokio::time::Duration::from_secs(60));
    loop {
        tokio::select! {
            _ = interval.tick() => {
                let data = fetch_announcements(&state).await;
                let m = json!({ "type": "announcements", "data": data });
                if socket.send(AMsg::Text(m.to_string().into())).await.is_err() { break; }
            }
            msg = socket.next() => {
                match msg {
                    Some(Ok(AMsg::Close(_))) | None => break,
                    Some(Ok(AMsg::Ping(p))) => { let _ = socket.send(AMsg::Pong(p)).await; }
                    _ => {}
                }
            }
        }
    }
    info!("WS announcements client disconnected");
}

async fn fetch_announcements(state: &Arc<AppState>) -> serde_json::Value {
    let url = format!("{}/api/content/announcements", state.catalogue_url);
    match state.ml.get(&url).send().await {
        Ok(r) => r.json::<serde_json::Value>().await.unwrap_or(json!([])),
        Err(_) => json!([]),
    }
}

// ── Customers WS proxy ───────────────────────────────────────────────────────

pub async fn ws_customers(
    ws: WebSocketUpgrade,
    State(state): State<Arc<AppState>>,
) -> Response {
    let upstream = state.catalogue_url
        .replace("http://", "ws://")
        .replace("https://", "wss://")
        + "/api/customers/ws";
    ws.on_upgrade(move |socket| proxy_ws(socket, upstream))
}

async fn proxy_ws(client: WebSocket, upstream_url: String) {
    // Connect upstream with explicit type
    let upstream: WebSocketStream<MaybeTlsStream<TcpStream>> =
        match tokio_tungstenite::connect_async(&upstream_url).await {
            Ok((ws, _)) => ws,
            Err(e) => {
                tracing::error!("WS proxy connect failed {}: {}", upstream_url, e);
                return;
            }
        };

    let (mut client_tx, mut client_rx) = client.split();
    let (mut up_tx, mut up_rx) = upstream.split();

    // Channel: browser messages → upstream sender task
    let (browser_tx, mut browser_rx) = tokio::sync::mpsc::unbounded_channel::<TMsg>();
    // Channel: upstream messages → browser sender task
    let (upstr_tx, mut upstr_rx) = tokio::sync::mpsc::unbounded_channel::<AMsg>();

    // Task 1: read from browser, forward to channel
    let t1 = tokio::spawn(async move {
        while let Some(Ok(msg)) = client_rx.next().await {
            let tmsg: TMsg = match msg {
                AMsg::Text(t)   => TMsg::Text(t.to_string().into()),
                AMsg::Binary(b) => TMsg::Binary(b.into()),
                AMsg::Ping(p)   => TMsg::Ping(p.into()),
                AMsg::Pong(p)   => TMsg::Pong(p.into()),
                AMsg::Close(_)  => break,
            };
            if browser_tx.send(tmsg).is_err() { break; }
        }
    });

    // Task 2: read from browser channel, send to upstream
    let t2 = tokio::spawn(async move {
        while let Some(msg) = browser_rx.recv().await {
            if up_tx.send(msg).await.is_err() { break; }
        }
    });

    // Task 3: read from upstream, forward to channel
    let t3 = tokio::spawn(async move {
        loop {
            match up_rx.next().await {
                Some(Ok(TMsg::Text(t)))   => { if upstr_tx.send(AMsg::Text(t.to_string().into())).is_err() { break; } }
                Some(Ok(TMsg::Binary(b))) => { if upstr_tx.send(AMsg::Binary(b.into())).is_err() { break; } }
                Some(Ok(TMsg::Ping(p)))   => { if upstr_tx.send(AMsg::Ping(p.into())).is_err() { break; } }
                Some(Ok(TMsg::Pong(p)))   => { if upstr_tx.send(AMsg::Pong(p.into())).is_err() { break; } }
                Some(Ok(TMsg::Close(_))) | None => break,
                _ => continue,
            }
        }
    });

    // Task 4: read from upstream channel, send to browser
    let t4 = tokio::spawn(async move {
        while let Some(msg) = upstr_rx.recv().await {
            if client_tx.send(msg).await.is_err() { break; }
        }
    });

    // Stop all tasks when any one finishes
    tokio::select! {
        _ = t1 => {}
        _ = t2 => {}
        _ = t3 => {}
        _ = t4 => {}
    }
}

/// /ws/admin/stats — pushes live payment/stats updates
pub async fn ws_admin_stats(
    ws: WebSocketUpgrade,
    State(state): State<Arc<AppState>>,
) -> Response {
    let upstream = state.catalogue_url
        .replace("http://", "ws://")
        .replace("https://", "wss://")
        + "/api/ws/admin/stats";
    ws.on_upgrade(move |socket| proxy_ws(socket, upstream))
}

/// /api/settings/ws — real-time settings sync (public, no auth required)
pub async fn ws_settings(
    ws: WebSocketUpgrade,
    State(state): State<Arc<AppState>>,
) -> Response {
    let upstream = state.catalogue_url
        .replace("http://", "ws://")
        .replace("https://", "wss://")
        + "/api/settings/ws";
    ws.on_upgrade(move |socket| proxy_ws(socket, upstream))
}
