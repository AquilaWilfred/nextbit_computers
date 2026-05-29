// ── Daraja API Client — Token Manager ─────────────────────────────────────────
// Mirrors the FlutterwaveClient OAuth pattern already in the project.
// Daraja uses Basic Auth (base64 consumer_key:consumer_secret) to get a
// short-lived Bearer token from the OAuth endpoint.
// All sub-modules (c2b, b2c, etc.) call `DarajaClient::access_token()`.

pub mod c2b;
pub mod b2c;
pub mod transaction_status;
pub mod account_balance;
pub mod tax_remittance;
pub mod query_org;

use base64::{engine::general_purpose::STANDARD as B64, Engine};
use chrono::{DateTime, Utc};
use reqwest::Client;
use serde::Deserialize;
use std::sync::Arc;
use tokio::sync::RwLock;

use crate::models::daraja_escrow::DarajaError;

// ── Client ─────────────────────────────────────────────────────────────────────

#[derive(Clone)]
pub struct DarajaClient {
    pub http:           Client,
    consumer_key:       String,
    consumer_secret:    String,
    pub base_url:       String,         // sandbox vs production
    pub shortcode:      String,         // your C2B/B2C shortcode
    pub b2c_shortcode:  String,         // initiator shortcode for B2C
    pub initiator_name: String,
    pub security_cred:  String,         // encrypted initiator password
    pub passkey:        String,         // STK push passkey
    pub callback_base:  String,         // your HTTPS base, e.g. https://api.nextbit.co.ke
    cached_token:       Arc<RwLock<Option<CachedToken>>>,
}

#[derive(Clone)]
struct CachedToken {
    access_token: String,
    expires_at:   DateTime<Utc>,
}

#[derive(Deserialize)]
struct TokenResponse {
    access_token: String,
    expires_in:   String,   // Daraja returns this as a string, e.g. "3599"
}

impl DarajaClient {
    #[allow(clippy::too_many_arguments)]
    pub fn new(
        http:           Client,
        consumer_key:   String,
        consumer_secret: String,
        base_url:       String,
        shortcode:      String,
        b2c_shortcode:  String,
        initiator_name: String,
        security_cred:  String,
        passkey:        String,
        callback_base:  String,
    ) -> Self {
        Self {
            http,
            consumer_key,
            consumer_secret,
            base_url,
            shortcode,
            b2c_shortcode,
            initiator_name,
            security_cred,
            passkey,
            callback_base,
            cached_token: Arc::new(RwLock::new(None)),
        }
    }

    // ── OAuth Token ────────────────────────────────────────────────────────────
    // GET /oauth/v1/generate?grant_type=client_credentials
    // Authorization: Basic base64(consumer_key:consumer_secret)
    // Double-checked locking — same pattern as FlutterwaveClient.

    pub async fn access_token(&self) -> Result<String, DarajaError> {
        // Fast path: read lock
        {
            let cache = self.cached_token.read().await;
            if let Some(ref t) = *cache {
                if t.expires_at > Utc::now() + chrono::Duration::seconds(60) {
                    return Ok(t.access_token.clone());
                }
            }
        }

        // Slow path: write lock, re-check
        let mut cache = self.cached_token.write().await;
        if let Some(ref t) = *cache {
            if t.expires_at > Utc::now() + chrono::Duration::seconds(60) {
                return Ok(t.access_token.clone());
            }
        }

        let credentials = B64.encode(format!("{}:{}", self.consumer_key, self.consumer_secret));
        let url = format!(
            "{}/oauth/v1/generate?grant_type=client_credentials",
            self.base_url
        );

        let resp = self
            .http
            .get(&url)
            .header("Authorization", format!("Basic {}", credentials))
            .send()
            .await
            .map_err(|e| DarajaError::Http(format!("Token fetch failed: {}", e)))?;

        if !resp.status().is_success() {
            let status = resp.status();
            let body = resp.text().await.unwrap_or_default();
            return Err(DarajaError::Http(format!(
                "Token endpoint returned {}: {}",
                status, body
            )));
        }

        let token_resp: TokenResponse = resp
            .json()
            .await
            .map_err(|e| DarajaError::Http(format!("Token parse failed: {}", e)))?;

        let expires_in: i64 = token_resp
            .expires_in
            .parse()
            .unwrap_or(3599);

        let expires_at = Utc::now() + chrono::Duration::seconds(expires_in);

        *cache = Some(CachedToken {
            access_token: token_resp.access_token.clone(),
            expires_at,
        });

        Ok(token_resp.access_token)
    }

    // ── STK Password ───────────────────────────────────────────────────────────
    // Required for STK push: base64(shortcode + passkey + timestamp)
    pub fn stk_password(&self, timestamp: &str) -> String {
        let raw = format!("{}{}{}", self.shortcode, self.passkey, timestamp);
        B64.encode(raw)
    }

    // ── Timestamp helper ───────────────────────────────────────────────────────
    pub fn timestamp() -> String {
        Utc::now().format("%Y%m%d%H%M%S").to_string()
    }
}