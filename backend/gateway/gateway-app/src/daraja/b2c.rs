// ── Daraja B2C ─────────────────────────────────────────────────────────────────
// Business to Customer — used for:
//   • Releasing escrow funds to seller (ReleasedToSeller → PayoutCompleted)
//   • Refunding buyer when admin rules for them or delivery fails (→ Refunded)
//
// Command options (from your sandbox products):
//   "BusinessPayment"   — non-salary payment to customer, no tax
//   "SalaryPayment"     — salary disbursement
//   "PromotionPayment"  — promotional payment
//
// For escrow payouts: use "BusinessPayment"
// For refunds:        use "BusinessPayment"

use serde::{Deserialize, Serialize};

use super::DarajaClient;
use crate::models::daraja_escrow::DarajaError;

// ── Request ────────────────────────────────────────────────────────────────────

// #[derive(Debug, Serialize)]
// #[serde(rename_all = "PascalCase")]
// pub struct B2cRequest {
//     pub originator_conversation_id: String,   // unique ref — use escrow_id
//     pub initiator_name:             String,
//     pub security_credential:        String,
//     pub command_i_d:                String,   // "BusinessPayment"
//     pub amount:                     u64,      // KES whole number
//     pub party_a:                    String,   // your B2C shortcode
//     pub party_b:                    String,   // recipient phone 2547XXXXXXXX
//     pub remarks:                    String,
//     pub queue_timeout_u_r_l:        String,
//     pub result_u_r_l:               String,
//     pub occasion:                   String,   // optional free text
// }

#[derive(Debug, Serialize)]
pub struct B2cRequest {
    #[serde(rename = "OriginatorConversationID")]
    pub originator_conversation_id: String,
    #[serde(rename = "InitiatorName")]
    pub initiator_name:             String,
    #[serde(rename = "SecurityCredential")]
    pub security_credential:        String,
    #[serde(rename = "CommandID")]
    pub command_i_d:                String,
    #[serde(rename = "Amount")]
    pub amount:                     u64,
    #[serde(rename = "PartyA")]
    pub party_a:                    String,
    #[serde(rename = "PartyB")]
    pub party_b:                    String,
    #[serde(rename = "Remarks")]
    pub remarks:                    String,
    #[serde(rename = "QueueTimeOutURL")]
    pub queue_timeout_u_r_l:        String,
    #[serde(rename = "ResultURL")]
    pub result_u_r_l:               String,
    #[serde(rename = "Occasion")]
    pub occasion:                   String,
}

// ── Response (Daraja's immediate ACK) ─────────────────────────────────────────

// #[derive(Debug, Deserialize)]
// #[serde(rename_all = "PascalCase")]
// pub struct B2cResponse {
//     pub originator_conversation_id: String,
//     pub conversation_id:            String,
//     pub response_code:              String,
//     pub response_description:       String,
// }


#[derive(Debug, Deserialize)]
pub struct B2cResponse {
    #[serde(rename = "OriginatorConversationID")]
    pub originator_conversation_id: String,
    #[serde(rename = "ConversationID")]
    pub conversation_id:            String,
    #[serde(rename = "ResponseCode")]
    pub response_code:              String,
    #[serde(rename = "ResponseDescription")]
    pub response_description:       String,
}

// ── Result Callback (Daraja → our server) ─────────────────────────────────────
// Daraja posts this to result_url asynchronously after processing

// #[derive(Debug, Deserialize)]
// #[serde(rename_all = "PascalCase")]
// pub struct B2cResult {
//     pub result: B2cResultBody,
// }

#[derive(Debug, Deserialize)]
pub struct B2cResult {
    #[serde(rename = "Result")]
    pub result: B2cResultBody,
}

// #[derive(Debug, Deserialize)]
// #[serde(rename_all = "PascalCase")]
// pub struct B2cResultBody {
//     pub result_type:                i32,
//     pub result_code:                i32,    // 0 = success
//     pub result_desc:                String,
//     pub originator_conversation_id: String,
//     pub conversation_id:            String,
//     pub transaction_i_d:            String, // Mpesa receipt e.g. OFI2XXXXXXX
//     pub result_parameters:          Option<B2cResultParameters>,
// }

#[derive(Debug, Deserialize)]
pub struct B2cResultBody {
    #[serde(rename = "ResultType")]
    pub result_type:                i32,
    #[serde(rename = "ResultCode")]
    pub result_code:                i32,
    #[serde(rename = "ResultDesc")]
    pub result_desc:                String,
    #[serde(rename = "OriginatorConversationID")]
    pub originator_conversation_id: String,
    #[serde(rename = "ConversationID")]
    pub conversation_id:            String,
    #[serde(rename = "TransactionID")]
    pub transaction_i_d:            String,
    #[serde(rename = "ResultParameters")]
    pub result_parameters:          Option<B2cResultParameters>,
}


// #[derive(Debug, Deserialize)]
// #[serde(rename_all = "PascalCase")]
// pub struct B2cResultParameters {
//     pub result_parameter: Vec<B2cResultItem>,
// }

#[derive(Debug, Deserialize)]
pub struct B2cResultParameters {
    #[serde(rename = "ResultParameter")]
    pub result_parameter: Vec<B2cResultItem>,
}

// #[derive(Debug, Deserialize)]
// #[serde(rename_all = "PascalCase")]
// pub struct B2cResultItem {
//     pub key:   String,
//     pub value: Option<serde_json::Value>,
// }

#[derive(Debug, Deserialize)]
pub struct B2cResultItem {
    #[serde(rename = "Key")]
    pub key:   String,
    #[serde(rename = "Value")]
    pub value: Option<serde_json::Value>,
}

impl B2cResultBody {
    pub fn is_success(&self) -> bool {
        self.result_code == 0
    }
}

impl B2cResultParameters {
    pub fn get(&self, key: &str) -> Option<String> {
        self.result_parameter
            .iter()
            .find(|i| i.key == key)
            .and_then(|i| i.value.as_ref())
            .map(|v| match v {
                serde_json::Value::String(s) => s.clone(),
                other => other.to_string(),
            })
    }

    pub fn transaction_amount(&self) -> Option<u64> {
        self.get("TransactionAmount")
            .and_then(|s| s.parse().ok())
    }

    pub fn receiver_party_public_name(&self) -> Option<String> {
        self.get("ReceiverPartyPublicName")
    }

    pub fn b2c_recipient_is_registered_customer(&self) -> Option<String> {
        self.get("B2CRecipientIsRegisteredCustomer")
    }
}

// ── Queue Timeout Callback (Daraja → our server) ──────────────────────────────
// Fired when Daraja can't reach the result URL — we must check via
// TransactionStatus API

#[derive(Debug, Deserialize)]
pub struct B2cTimeout {
    #[serde(rename = "ResultCode")]
    pub result_code: i32,
    #[serde(rename = "ResultDesc")]
    pub result_desc: String,
}

// ── API Call ───────────────────────────────────────────────────────────────────

impl DarajaClient {
    /// Initiate a B2C payment — either payout to seller or refund to buyer.
    ///
    /// `originator_id` should be the escrow UUID (used to match the callback).
    /// `phone`         format: 2547XXXXXXXX
    /// `amount_kes`    whole KES — Daraja does not accept decimals
    /// `command`       "BusinessPayment" for both payouts and refunds
    /// `remarks`       short description shown on recipient's M-Pesa message
    pub async fn b2c_payment(
        &self,
        originator_id: &str,
        phone:         &str,
        amount_kes:    u64,
        command:       &str,
        remarks:       &str,
    ) -> Result<B2cResponse, DarajaError> {
        let token = self.access_token().await?;
        let url = format!("{}/mpesa/b2c/v3/paymentrequest", self.base_url);

        let body = B2cRequest {
            originator_conversation_id: originator_id.to_string(),
            initiator_name:             self.initiator_name.clone(),
            security_credential:        self.security_cred.clone(),
            command_i_d:                command.to_string(),
            amount:                     amount_kes,
            party_a:                    self.b2c_shortcode.clone(),
            party_b:                    phone.to_string(),
            remarks:                    remarks.to_string(),
            queue_timeout_u_r_l:        format!("{}/daraja/b2c/timeout", self.callback_base),
            result_u_r_l:               format!("{}/daraja/b2c/result", self.callback_base),
            occasion:                   originator_id.to_string(),
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
                "B2C request failed {}: {}",
                status, body
            )));
        }

        resp.json::<B2cResponse>()
            .await
            .map_err(|e| DarajaError::Http(format!("B2C response parse failed: {}", e)))
    }
}