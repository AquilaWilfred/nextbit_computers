// ── Daraja C2B ─────────────────────────────────────────────────────────────────
// Two flows:
//   1. STK Push  — we prompt the buyer's phone programmatically (LipaNaMpesa)
//   2. C2B Register — register validation + confirmation URLs for paybill/till
//
// In the escrow flow:
//   Buyer pays → Daraja calls our confirmation URL → we verify via
//   TransactionStatus → apply_transition(PaymentConfirmed) → FundsHeldInEscrow

use chrono::Utc;
use serde::{Deserialize, Serialize};

use super::DarajaClient;
use crate::models::daraja_escrow::DarajaError;

// ── STK Push (LipaNaMpesa Online) ─────────────────────────────────────────────

#[derive(Debug, Serialize)]
#[serde(rename_all = "PascalCase")]
pub struct StkPushRequest {
    pub business_short_code: String,
    pub password:            String,
    pub timestamp:           String,
    pub transaction_type:    String,    // "CustomerPayBillOnline"
    pub amount:              u64,       // KES, whole number
    pub party_a:             String,    // buyer phone: 2547XXXXXXXX
    pub party_b:             String,    // your shortcode
    pub phone_number:        String,    // same as party_a
    pub call_back_u_r_l:     String,
    pub account_reference:   String,    // escrow_id or order_id
    pub transaction_desc:    String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "PascalCase")]
pub struct StkPushResponse {
    pub merchant_request_id:   String,
    pub checkout_request_id:   String,
    pub response_code:         String,
    pub response_description:  String,
    pub customer_message:      String,
}

// ── STK Push Callback (Daraja → our server) ───────────────────────────────────

#[derive(Debug, Deserialize)]
#[serde(rename_all = "PascalCase")]
pub struct StkCallback {
    pub body: StkCallbackBody,
}

#[derive(Debug, Deserialize)]
pub struct StkCallbackBody {
    #[serde(rename = "stkCallback")]
    pub stk_callback: StkCallbackData,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "PascalCase")]
pub struct StkCallbackData {
    pub merchant_request_id:  String,
    pub checkout_request_id:  String,
    pub result_code:          i32,      // 0 = success
    pub result_desc:          String,
    pub callback_metadata:    Option<StkCallbackMetadata>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "PascalCase")]
pub struct StkCallbackMetadata {
    pub item: Vec<StkMetadataItem>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "PascalCase")]
pub struct StkMetadataItem {
    pub name:  String,
    pub value: Option<serde_json::Value>,
}

impl StkCallbackMetadata {
    /// Extract a named field from the metadata item list
    pub fn get(&self, name: &str) -> Option<String> {
        self.item
            .iter()
            .find(|i| i.name == name)
            .and_then(|i| i.value.as_ref())
            .map(|v| match v {
                serde_json::Value::String(s) => s.clone(),
                other => other.to_string(),
            })
    }

    pub fn mpesa_receipt(&self) -> Option<String> {
        self.get("MpesaReceiptNumber")
    }

    pub fn amount(&self) -> Option<u64> {
        self.get("Amount")
            .and_then(|s| s.parse().ok())
    }

    pub fn phone(&self) -> Option<String> {
        self.get("PhoneNumber")
    }
}

// ── C2B Register URLs ──────────────────────────────────────────────────────────

#[derive(Debug, Serialize)]
#[serde(rename_all = "PascalCase")]
pub struct RegisterUrlRequest {
    pub shortcode:        String,
    pub response_type:    String,   // "Completed" or "Cancelled"
    pub confirmation_url: String,
    pub validation_url:   String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "PascalCase")]
pub struct RegisterUrlResponse {
    pub originator_coversation_id: Option<String>,
    pub response_code:             String,
    pub response_description:      String,
}

// ── C2B Confirmation (Daraja → our server) ────────────────────────────────────
// Daraja posts this to your confirmation_url after a successful payment

#[derive(Debug, Deserialize)]
#[serde(rename_all = "PascalCase")]
pub struct C2bConfirmation {
    pub transaction_type:     String,
    pub trans_id:             String,   // Mpesa receipt number
    pub trans_time:           String,
    pub trans_amount:         String,
    pub business_short_code:  String,
    pub bill_ref_number:      String,   // this is your AccountReference
    pub invoice_number:       Option<String>,
    pub org_account_balance:  Option<String>,
    pub third_party_trans_id: Option<String>,
    pub msisdn:               String,   // buyer phone
    pub first_name:           Option<String>,
    pub middle_name:          Option<String>,
    pub last_name:            Option<String>,
}

// ── C2B Validation Response (our server → Daraja) ─────────────────────────────

#[derive(Debug, Serialize)]
#[serde(rename_all = "PascalCase")]
pub struct ValidationResponse {
    pub result_code: String,    // "0" = accept, "C2B00011" = reject
    pub result_desc: String,
}

impl ValidationResponse {
    pub fn accept() -> Self {
        Self {
            result_code: "0".into(),
            result_desc: "Accepted".into(),
        }
    }

    pub fn reject(reason: &str) -> Self {
        Self {
            result_code: "C2B00011".into(),
            result_desc: reason.to_string(),
        }
    }
}

// ── API Calls ──────────────────────────────────────────────────────────────────

impl DarajaClient {
    /// Register C2B validation + confirmation URLs with Daraja.
    /// Call once at startup (or re-register on config change).
    pub async fn register_c2b_urls(&self) -> Result<RegisterUrlResponse, DarajaError> {
        let token = self.access_token().await?;
        let url = format!("{}/mpesa/c2b/v1/registerurl", self.base_url);

        let body = RegisterUrlRequest {
            shortcode:        self.shortcode.clone(),
            response_type:    "Completed".into(),
            confirmation_url: format!("{}/daraja/c2b/confirmation", self.callback_base),
            validation_url:   format!("{}/daraja/c2b/validation", self.callback_base),
        };

        let resp = self
            .http
            .post(&url)
            .bearer_auth(&token)
            .json(&body)
            .send()
            .await
            .map_err(|e| DarajaError::Http(e.to_string()))?;

        resp.json::<RegisterUrlResponse>()
            .await
            .map_err(|e| DarajaError::Http(format!("Register URL parse failed: {}", e)))
    }

    /// Initiate STK push — prompts buyer's phone with M-Pesa PIN dialog.
    /// `account_reference` should be the escrow UUID so we can look it up
    /// in the callback.
    pub async fn stk_push(
        &self,
        phone:             &str,   // 2547XXXXXXXX
        amount_kes:        u64,
        account_reference: &str,   // escrow_id as string
        description:       &str,
    ) -> Result<StkPushResponse, DarajaError> {
        let token = self.access_token().await?;
        let url = format!(
            "{}/mpesa/stkpush/v1/processrequest",
            self.base_url
        );
        let ts = DarajaClient::timestamp();
        let password = self.stk_password(&ts);

        let body = StkPushRequest {
            business_short_code: self.shortcode.clone(),
            password,
            timestamp:           ts,
            transaction_type:    "CustomerPayBillOnline".into(),
            amount:              amount_kes,
            party_a:             phone.to_string(),
            party_b:             self.shortcode.clone(),
            phone_number:        phone.to_string(),
            call_back_u_r_l:     format!("{}/daraja/stk/callback", self.callback_base),
            account_reference:   account_reference.to_string(),
            transaction_desc:    description.to_string(),
        };

        let resp = self
            .http
            .post(&url)
            .bearer_auth(&token)
            .json(&body)
            .send()
            .await
            .map_err(|e| DarajaError::Http(e.to_string()))?;

        if !resp.status().is_success() {
            let status = resp.status();
            let body = resp.text().await.unwrap_or_default();
            return Err(DarajaError::Http(format!(
                "STK push failed {}: {}",
                status, body
            )));
        }

        resp.json::<StkPushResponse>()
            .await
            .map_err(|e| DarajaError::Http(format!("STK push parse failed: {}", e)))
    }
}