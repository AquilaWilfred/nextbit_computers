use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tokio::sync::RwLock;
use chrono::{DateTime, Utc};

use crate::models::escrow::EscrowError;

// ── OAuth2 Token Cache ─────────────────────────────────────────────────────────
// Flutterwave v4 uses OAuth2 — exchange client_id + client_secret for a
// short-lived access token, cache it, refresh before expiry.

#[derive(Clone)]
pub struct FlutterwaveClient {
    pub http:          Client,
    client_id:         String,
    client_secret:     String,
    token_url:         String,
    api_base:          String,
    webhook_secret:    String,
    cached_token:      Arc<RwLock<Option<CachedToken>>>,
}

#[derive(Clone)]
struct CachedToken {
    access_token: String,
    expires_at:   DateTime<Utc>,
}

#[derive(Deserialize)]
struct TokenResponse {
    access_token: String,
    expires_in:   u64,   // seconds
}

impl FlutterwaveClient {
    pub fn new(
        http:           Client,
        client_id:      String,
        client_secret:  String,
        token_url:      String,
        api_base:       String,
        webhook_secret: String,
    ) -> Self {
        Self {
            http,
            client_id,
            client_secret,
            token_url,
            api_base,
            webhook_secret,
            cached_token: Arc::new(RwLock::new(None)),
        }
    }

    // Returns a valid access token — fetches new one if expired or missing
    pub async fn access_token(&self) -> Result<String, EscrowError> {
        // Check cache first (read lock)
        {
            let cache = self.cached_token.read().await;
            if let Some(ref t) = *cache {
                // Use cached token if it has more than 60s left
                if t.expires_at > Utc::now() + chrono::Duration::seconds(60) {
                    return Ok(t.access_token.clone());
                }
            }
        }

        // Fetch new token (write lock)
        let mut cache = self.cached_token.write().await;

        // Double-check after acquiring write lock (another task may have refreshed)
        if let Some(ref t) = *cache {
            if t.expires_at > Utc::now() + chrono::Duration::seconds(60) {
                return Ok(t.access_token.clone());
            }
        }

        let resp = self.http
            .post(&self.token_url)
            .form(&[
                ("grant_type",    "client_credentials"),
                ("client_id",     &self.client_id),
                ("client_secret", &self.client_secret),
            ])
            .send()
            .await
            .map_err(|e| EscrowError::Flutterwave(format!("Token fetch failed: {}", e)))?;

        if !resp.status().is_success() {
            let status = resp.status();
            let body = resp.text().await.unwrap_or_default();
            return Err(EscrowError::Flutterwave(
                format!("Token endpoint returned {}: {}", status, body)
            ));
        }

        let token_resp: TokenResponse = resp
            .json()
            .await
            .map_err(|e| EscrowError::Flutterwave(format!("Token parse failed: {}", e)))?;

        let expires_at = Utc::now() + chrono::Duration::seconds(token_resp.expires_in as i64);

        *cache = Some(CachedToken {
            access_token: token_resp.access_token.clone(),
            expires_at,
        });

        Ok(token_resp.access_token)
    }

    // ── Webhook Signature Verification ────────────────────────────────────────
    // v4 still uses verif-hash header with plain string comparison
    pub fn verify_webhook(&self, header_sig: &str) -> bool {
        header_sig == self.webhook_secret
    }

    // ── Create Hosted Payment Link ─────────────────────────────────────────────
    pub async fn create_payment_link(
        &self,
        request: PaymentLinkRequest,
    ) -> Result<String, EscrowError> {
        let token = self.access_token().await?;
        let url = format!("{}/v3/payments", self.api_base);

        let resp = self.http
            .post(&url)
            .bearer_auth(&token)
            .json(&request)
            .send()
            .await
            .map_err(|e| EscrowError::Flutterwave(e.to_string()))?;

        let body: PaymentLinkResponse = resp
            .json()
            .await
            .map_err(|e| EscrowError::Flutterwave(e.to_string()))?;

        if body.status != "success" {
            return Err(EscrowError::Flutterwave(body.message));
        }

        body.data
            .map(|d| d.link)
            .ok_or_else(|| EscrowError::Flutterwave("No payment link in response".into()))
    }

    // ── Verify Charge with FW API ──────────────────────────────────────────────
    pub async fn verify_charge(
        &self,
        charge_id:       &str,
        expected_status: &str,
    ) -> Result<bool, EscrowError> {
        let token = self.access_token().await?;
        let url = format!("{}/v3/transactions/{}/verify", self.api_base, charge_id);

        let resp = self.http
            .get(&url)
            .bearer_auth(&token)
            .send()
            .await
            .map_err(|e| EscrowError::Flutterwave(e.to_string()))?;

        let body: serde_json::Value = resp
            .json()
            .await
            .map_err(|e| EscrowError::Flutterwave(e.to_string()))?;

        let status = body["data"]["status"].as_str().unwrap_or("");
        Ok(status == expected_status)
    }

    // ── Initiate Payout to Seller ──────────────────────────────────────────────
    pub async fn initiate_transfer(
        &self,
        request: TransferRequest,
    ) -> Result<TransferResponse, EscrowError> {
        let token = self.access_token().await?;
        let url = format!("{}/v3/transfers", self.api_base);

        let resp = self.http
            .post(&url)
            .bearer_auth(&token)
            .json(&request)
            .send()
            .await
            .map_err(|e| EscrowError::Flutterwave(e.to_string()))?;

        let transfer: TransferResponse = resp
            .json()
            .await
            .map_err(|e| EscrowError::Flutterwave(e.to_string()))?;

        if transfer.status != "success" {
            return Err(EscrowError::Flutterwave(transfer.message));
        }

        Ok(transfer)
    }
}

// ── Webhook Payload ────────────────────────────────────────────────────────────

#[derive(Debug, Deserialize)]
pub struct FlutterwaveWebhook {
    pub event: String,
    pub data:  WebhookData,
}

#[derive(Debug, Deserialize)]
pub struct WebhookData {
    pub id:                   u64,
    pub tx_ref:               String,
    pub flw_ref:              String,
    pub amount:               f64,
    pub currency:             String,
    pub status:               String,
    pub charge_response_code: String,
}

// ── Payment Link ───────────────────────────────────────────────────────────────

#[derive(Debug, Serialize)]
pub struct PaymentLinkRequest {
    pub tx_ref:         String,
    pub amount:         f64,
    pub currency:       String,
    pub redirect_url:   String,
    pub customer:       PaymentCustomer,
    pub customizations: PaymentCustomizations,
}

#[derive(Debug, Serialize)]
pub struct PaymentCustomer {
    pub email: String,
    pub name:  String,
}

#[derive(Debug, Serialize)]
pub struct PaymentCustomizations {
    pub title:       String,
    pub description: String,
}

#[derive(Debug, Deserialize)]
pub struct PaymentLinkResponse {
    pub status:  String,
    pub message: String,
    pub data:    Option<PaymentLinkData>,
}

#[derive(Debug, Deserialize)]
pub struct PaymentLinkData {
    pub link: String,
}

// ── Transfer ───────────────────────────────────────────────────────────────────

#[derive(Debug, Serialize)]
pub struct TransferRequest {
    pub account_bank:   String,
    pub account_number: String,
    pub amount:         f64,
    pub currency:       String,
    pub narration:      String,
    pub reference:      String,
}

#[derive(Debug, Deserialize)]
pub struct TransferResponse {
    pub status:  String,
    pub message: String,
    pub data:    Option<TransferData>,
}

#[derive(Debug, Deserialize)]
pub struct TransferData {
    pub id:        u64,
    pub reference: String,
    pub status:    String,
}