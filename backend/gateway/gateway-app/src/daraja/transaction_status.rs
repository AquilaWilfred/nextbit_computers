// ── Daraja Transaction Status ──────────────────────────────────────────────────
// Used as a fallback when:
//   • STK push callback doesn't arrive within timeout
//   • B2C result URL isn't called (queue timeout fired instead)
//   • C2B confirmation is delayed
//
// Flow: fire the check → Daraja calls back our result_url asynchronously.
// This is NOT a synchronous query — you get an immediate ACK, then a callback.

use serde::{Deserialize, Serialize};

use super::DarajaClient;
use crate::models::daraja_escrow::DarajaError;

// ── Request ────────────────────────────────────────────────────────────────────

#[derive(Debug, Serialize)]
#[serde(rename_all = "PascalCase")]
pub struct TransactionStatusRequest {
    pub initiator:               String,
    pub security_credential:     String,
    pub command_i_d:             String,   // "TransactionStatusQuery"
    pub transaction_i_d:         String,   // Mpesa receipt e.g. OFI2XXXXXXX
    pub originator_conversation_id: String,
    pub party_a:                 String,   // shortcode or phone
    pub identifier_type:         String,   // "1"=MSISDN "4"=Shortcode "2"=Till
    pub result_u_r_l:            String,
    pub queue_timeout_u_r_l:     String,
    pub remarks:                 String,
    pub occasion:                String,
}

// ── Immediate ACK from Daraja ──────────────────────────────────────────────────

#[derive(Debug, Deserialize)]
#[serde(rename_all = "PascalCase")]
pub struct TransactionStatusAck {
    pub originator_conversation_id: String,
    pub conversation_id:            String,
    pub response_code:              String,
    pub response_description:       String,
}

// ── Result Callback (Daraja → our server) ─────────────────────────────────────

#[derive(Debug, Deserialize)]
#[serde(rename_all = "PascalCase")]
pub struct TransactionStatusResult {
    pub result: TxStatusResultBody,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "PascalCase")]
pub struct TxStatusResultBody {
    pub result_type:                i32,
    pub result_code:                i32,    // 0 = success
    pub result_desc:                String,
    pub originator_conversation_id: String,
    pub conversation_id:            String,
    pub transaction_i_d:            String,
    pub result_parameters:          Option<TxStatusParameters>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "PascalCase")]
pub struct TxStatusParameters {
    pub result_parameter: Vec<TxStatusItem>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "PascalCase")]
pub struct TxStatusItem {
    pub key:   String,
    pub value: Option<serde_json::Value>,
}

impl TxStatusParameters {
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

    /// "Completed" | "Failed" | "Reversed" | "Timeout" etc.
    pub fn transaction_status(&self) -> Option<String> {
        self.get("TransactionStatus")
    }

    pub fn amount(&self) -> Option<u64> {
        self.get("Amount").and_then(|s| s.parse().ok())
    }

    pub fn debit_party_msisdn(&self) -> Option<String> {
        self.get("DebitPartyMSISDN")
    }

    pub fn credit_party_msisdn(&self) -> Option<String> {
        self.get("CreditPartyMSISDN")
    }

    pub fn originator_conversation_id(&self) -> Option<String> {
        self.get("OriginatorConversationID")
    }
}

impl TxStatusResultBody {
    pub fn is_completed(&self) -> bool {
        self.result_code == 0
            && self
                .result_parameters
                .as_ref()
                .and_then(|p| p.transaction_status())
                .map(|s| s == "Completed")
                .unwrap_or(false)
    }
}

// ── API Call ───────────────────────────────────────────────────────────────────

impl DarajaClient {
    /// Query the status of a Mpesa transaction by receipt number.
    ///
    /// `mpesa_receipt`    the M-Pesa transaction ID e.g. "OFI2XXXXXXX"
    /// `originator_id`    your reference — use escrow_id so the callback can
    ///                    look up the right escrow row
    /// `identifier_type`  "4" for shortcode (paybill/till), "1" for phone
    pub async fn query_transaction_status(
        &self,
        mpesa_receipt:  &str,
        originator_id:  &str,
        identifier_type: &str,
    ) -> Result<TransactionStatusAck, DarajaError> {
        let token = self.access_token().await?;
        let url = format!(
            "{}/mpesa/transactionstatus/v1/query",
            self.base_url
        );

        let body = TransactionStatusRequest {
            initiator:               self.initiator_name.clone(),
            security_credential:     self.security_cred.clone(),
            command_i_d:             "TransactionStatusQuery".into(),
            transaction_i_d:         mpesa_receipt.to_string(),
            originator_conversation_id: originator_id.to_string(),
            party_a:                 self.shortcode.clone(),
            identifier_type:         identifier_type.to_string(),
            result_u_r_l:            format!("{}/daraja/txstatus/result", self.callback_base),
            queue_timeout_u_r_l:     format!("{}/daraja/txstatus/timeout", self.callback_base),
            remarks:                 "Escrow verification".into(),
            occasion:                originator_id.to_string(),
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
                "Transaction status query failed {}: {}",
                status, body
            )));
        }

        resp.json::<TransactionStatusAck>()
            .await
            .map_err(|e| DarajaError::Http(format!("TxStatus parse failed: {}", e)))
    }
}