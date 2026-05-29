// ── Daraja Account Balance ─────────────────────────────────────────────────────
// Check your shortcode balance before initiating B2C payouts.
// Like TransactionStatus, this is async: you get an ACK, then a callback.
//
// In the escrow flow: call this before releasing funds to confirm
// you have sufficient balance. Use the result callback to gate the payout.

use serde::{Deserialize, Serialize};

use super::DarajaClient;
use crate::models::daraja_escrow::DarajaError;

// ── Request ────────────────────────────────────────────────────────────────────

#[derive(Debug, Serialize)]
#[serde(rename_all = "PascalCase")]
pub struct AccountBalanceRequest {
    pub initiator:           String,
    pub security_credential: String,
    pub command_i_d:         String,    // "AccountBalance"
    pub party_a:             String,    // your shortcode
    pub identifier_type:     String,    // "4" for shortcode
    pub remarks:             String,
    pub queue_timeout_u_r_l: String,
    pub result_u_r_l:        String,
}

// ── Immediate ACK ──────────────────────────────────────────────────────────────

#[derive(Debug, Deserialize)]
#[serde(rename_all = "PascalCase")]
pub struct AccountBalanceAck {
    pub originator_conversation_id: String,
    pub conversation_id:            String,
    pub response_code:              String,
    pub response_description:       String,
}

// ── Result Callback (Daraja → our server) ─────────────────────────────────────

#[derive(Debug, Deserialize)]
#[serde(rename_all = "PascalCase")]
pub struct AccountBalanceResult {
    pub result: BalanceResultBody,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "PascalCase")]
pub struct BalanceResultBody {
    pub result_type:                i32,
    pub result_code:                i32,
    pub result_desc:                String,
    pub originator_conversation_id: String,
    pub conversation_id:            String,
    pub result_parameters:          Option<BalanceParameters>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "PascalCase")]
pub struct BalanceParameters {
    pub result_parameter: Vec<BalanceItem>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "PascalCase")]
pub struct BalanceItem {
    pub key:   String,
    pub value: Option<serde_json::Value>,
}

/// Parsed account balance per account type
#[derive(Debug, Clone)]
pub struct AccountBalance {
    pub account_name:     String,
    pub currency:         String,
    pub amount_cents:     i64,    // converted from KES (multiply by 100)
}

impl BalanceParameters {
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

    /// Daraja returns balance as:
    /// "Working Account|KES|500.00|500.00|0.00|0.00"
    /// Parse into structured AccountBalance list
    pub fn parse_balances(&self) -> Vec<AccountBalance> {
        self.get("AccountBalance")
            .map(|raw| {
                raw.split('&')
                    .filter_map(|entry| {
                        let parts: Vec<&str> = entry.split('|').collect();
                        if parts.len() >= 3 {
                            let amount_f: f64 = parts[2].parse().unwrap_or(0.0);
                            Some(AccountBalance {
                                account_name: parts[0].to_string(),
                                currency:     parts[1].to_string(),
                                amount_cents: (amount_f * 100.0).round() as i64,
                            })
                        } else {
                            None
                        }
                    })
                    .collect()
            })
            .unwrap_or_default()
    }
}

impl BalanceResultBody {
    pub fn is_success(&self) -> bool {
        self.result_code == 0
    }
}

// ── API Call ───────────────────────────────────────────────────────────────────

impl DarajaClient {
    /// Query your shortcode account balance.
    /// Daraja ACKs immediately; actual balance arrives via the result callback.
    pub async fn query_account_balance(
        &self,
        remarks: &str,
    ) -> Result<AccountBalanceAck, DarajaError> {
        let token = self.access_token().await?;
        let url = format!("{}/mpesa/accountbalance/v1/query", self.base_url);

        let body = AccountBalanceRequest {
            initiator:           self.initiator_name.clone(),
            security_credential: self.security_cred.clone(),
            command_i_d:         "AccountBalance".into(),
            party_a:             self.shortcode.clone(),
            identifier_type:     "4".into(),
            remarks:             remarks.to_string(),
            queue_timeout_u_r_l: format!("{}/daraja/balance/timeout", self.callback_base),
            result_u_r_l:        format!("{}/daraja/balance/result", self.callback_base),
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
                "Account balance query failed {}: {}",
                status, body
            )));
        }

        resp.json::<AccountBalanceAck>()
            .await
            .map_err(|e| DarajaError::Http(format!("Balance ACK parse failed: {}", e)))
    }
}