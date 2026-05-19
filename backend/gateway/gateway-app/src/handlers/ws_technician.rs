use axum::{
    extract::{Path, Query, State, WebSocketUpgrade},
    extract::ws::{Message, WebSocket},
    http::{HeaderMap, StatusCode},
    response::Response,
};
use futures_util::{SinkExt, StreamExt};
use std::collections::HashMap;
use std::sync::Arc;
use tokio_tungstenite::connect_async;
use tokio_tungstenite::tungstenite::Message as TungMessage;
use tracing::error;
use crate::state::AppState;

pub async fn proxy_ws_technician(
    State(state): State<Arc<AppState>>,
    ws: WebSocketUpgrade,
    Path(user_id): Path<i64>,
    headers: HeaderMap,
    Query(params): Query<HashMap<String, String>>,
) -> Response {
    // ── Auth check before upgrade ────────────────────────────────────
    let token = headers
        .get("cookie")
        .and_then(|v| v.to_str().ok())
        .and_then(|s| s.split(';').find_map(|p| {
            p.trim()
             .strip_prefix("nextbit_token=")
             .map(|v| v.to_string())
        }))
        .or_else(|| params.get("token").cloned());

    if token.is_none() {
        return Response::builder()
            .status(StatusCode::UNAUTHORIZED)
            .body(axum::body::Body::empty())
            .unwrap();
    }

    let catalogue_url = state.catalogue_url.clone();

    ws.on_upgrade(move |socket| async move {
        let upstream_url = format!(
            "{}/api/technician/ws/{}",
            catalogue_url.replace("http://", "ws://"),
            user_id
        );
        handle_ws_proxy(socket, upstream_url).await;
    })
}

async fn handle_ws_proxy(client_ws: WebSocket, upstream_url: String) {
    let (upstream_ws, _) = match connect_async(&upstream_url).await {
        Ok(conn) => conn,
        Err(e) => {
            error!("Failed to connect to upstream WebSocket {}: {}", upstream_url, e);
            return;
        }
    };

    let (mut upstream_tx, mut upstream_rx) = upstream_ws.split();
    let (mut client_tx, mut client_rx) = client_ws.split();

    // client → upstream
    let c2u = tokio::spawn(async move {
        while let Some(Ok(msg)) = client_rx.next().await {
            let tung_msg = match msg {
                Message::Text(t)   => TungMessage::Text(t.into()),  
                Message::Binary(b) => TungMessage::Binary(b.into()),
                Message::Ping(p)   => TungMessage::Ping(p.into()),  
                Message::Pong(p)   => TungMessage::Pong(p.into()),  
                Message::Close(_)  => break,
            };
            if upstream_tx.send(tung_msg).await.is_err() { break; }
        }
    });

    // upstream → client
    let u2c = tokio::spawn(async move {
        while let Some(Ok(msg)) = upstream_rx.next().await {
            let axum_msg = match msg {
                TungMessage::Text(t)   => Message::Text(t.to_string()),   
                TungMessage::Binary(b) => Message::Binary(b.to_vec()),    
                TungMessage::Ping(p)   => Message::Ping(p.to_vec()),      
                TungMessage::Pong(p)   => Message::Pong(p.to_vec()),      
                TungMessage::Close(_)  => break,
                _ => break,
            };
            if client_tx.send(axum_msg).await.is_err() { break; }
        }
    });

    tokio::select! {
        _ = c2u => {}
        _ = u2c => {}
    }
}