// ── Daraja Query Org Info ──────────────────────────────────────────────────────
// Maps to your "query org info" sandbox product.
// Used to validate your shortcode configuration on startup — confirms your
// shortcode is active and properly configured before accepting any payments.
//
// Also useful for: checking registered callback URLs, KYC status, service type.

use serde::{Deserialize, Serialize};

use super::DarajaClient;
use crate::models::daraja_escrow::DarajaError;

// ── Request ────────────────────────────────────────────────────────────────────

#[derive(Debug, Serialize)]
#[serde(rename_all = "PascalCase")]
pub struct QueryOrgRequest {
    pub initiator:           String,
    pub security_credential: String,
    pub command_i_d:         String,    // "QueryOrganizationInformation"
    pub party_a:             String,    // your shortcode
    pub identifier_type:     String,    // "4" = shortcode
    pub remarks:             String,
    pub result_u_r_l:        String,
    pub queue_timeout_u_r_l: String,
}

// ── Immediate ACK ──────────────────────────────────────────────────────────────

#[derive(Debug, Deserialize)]
#[serde(rename_all = "PascalCase")]
pub struct QueryOrgAck {
    pub originator_conversation_id: String,
    pub conversation_id:            String,
    pub response_code:              String,
    pub response_description:       String,
}

// ── Result Callback (Daraja → our server) ─────────────────────────────────────

#[derive(Debug, Deserialize)]
#[serde(rename_all = "PascalCase")]
pub struct QueryOrgResult {
    pub result: OrgResultBody,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "PascalCase")]
pub struct OrgResultBody {
    pub result_type:                i32,
    pub result_code:                i32,
    pub result_desc:                String,
    pub originator_conversation_id: String,
    pub conversation_id:            String,
    pub result_parameters:          Option<OrgResultParameters>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "PascalCase")]
pub struct OrgResultParameters {
    pub result_parameter: Vec<OrgResultItem>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "PascalCase")]
pub struct OrgResultItem {
    pub key:   String,
    pub value: Option<serde_json::Value>,
}

/// Parsed organisation information
#[derive(Debug, Clone)]
pub struct OrgInfo {
    pub shortcode:    String,
    pub org_name:     String,
    pub service_type: String,   // "Pay Bill" | "Buy Goods"
    pub status:       String,   // "Active" | "Inactive"
    pub callback_url: Option<String>,
}

impl OrgResultBody {
    pub fn is_success(&self) -> bool {
        self.result_code == 0
    }
}

impl OrgResultParameters {
    fn get(&self, key: &str) -> Option<String> {
        self.result_parameter
            .iter()
            .find(|i| i.key == key)
            .and_then(|i| i.value.as_ref())
            .map(|v| match v {
                serde_json::Value::String(s) => s.clone(),
                other => other.to_string(),
            })
    }

    pub fn parse_org_info(&self) -> OrgInfo {
        OrgInfo {
            shortcode:    self.get("ShortCode").unwrap_or_default(),
            org_name:     self.get("OrgName").unwrap_or_default(),
            service_type: self.get("ServiceType").unwrap_or_default(),
            status:       self.get("OrgStatus").unwrap_or_default(),
            callback_url: self.get("CallBackURL"),
        }
    }
}

// ── API Call ───────────────────────────────────────────────────────────────────

impl DarajaClient {
    /// Query your organisation/shortcode info.
    /// Call at startup to verify your shortcode is active.
    /// Result arrives via async callback to /daraja/orginfo/result.
    pub async fn query_org_info(
        &self,
        remarks: &str,
    ) -> Result<QueryOrgAck, DarajaError> {
        let token = self.access_token().await?;
        let url = format!(
            "{}/mpesa/queryorginfo/v1/query",
            self.base_url
        );

        let body = QueryOrgRequest {
            initiator:           self.initiator_name.clone(),
            security_credential: self.security_cred.clone(),
            command_i_d:         "QueryOrganizationInformation".into(),
            party_a:             self.shortcode.clone(),
            identifier_type:     "4".into(),
            remarks:             remarks.to_string(),
            result_u_r_l:        format!("{}/daraja/orginfo/result", self.callback_base),
            queue_timeout_u_r_l: format!("{}/daraja/orginfo/timeout", self.callback_base),
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
                "Query org info failed {}: {}",
                status, body
            )));
        }

        resp.json::<QueryOrgAck>()
            .await
            .map_err(|e| DarajaError::Http(format!("Org info ACK parse failed: {}", e)))
    }
}