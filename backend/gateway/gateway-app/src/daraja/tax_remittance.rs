// ── Daraja Tax Remittance ──────────────────────────────────────────────────────
// Used to deduct and remit applicable taxes before releasing funds to seller.
// Maps to your "pre-tubs sandbox" product.
//
// In the escrow flow:
//   ReleasedToSeller → compute tax → remit to KRA → release net to seller
//
// Withholding tax rate (typical): 5% on professional services, 3% on goods.
// Excise duty: 15% on certain transaction fees.
// Always confirm with your tax advisor — these are configurable.

use serde::{Deserialize, Serialize};

use super::DarajaClient;
use crate::models::daraja_escrow::DarajaError;

// ── Tax Types ──────────────────────────────────────────────────────────────────

#[derive(Debug, Clone, PartialEq)]
pub enum TaxType {
    WithholdingTax,   // WHT on professional services / goods
    ExciseDuty,       // On transaction fees
    VAT,              // On platform fees
}

impl TaxType {
    pub fn account_type(&self) -> &str {
        match self {
            TaxType::WithholdingTax => "KRARemitta",
            TaxType::ExciseDuty     => "KRARemitta",
            TaxType::VAT            => "KRARemitta",
        }
    }

    /// Basis points — configurable per your tax setup
    pub fn rate_bps(&self) -> u64 {
        match self {
            TaxType::WithholdingTax => 500,    // 5%
            TaxType::ExciseDuty     => 1500,   // 15%
            TaxType::VAT            => 1600,   // 16%
        }
    }
}

/// Compute tax amount in KES (whole number, rounded down)
pub fn compute_tax_kes(amount_kes: u64, tax_type: &TaxType) -> u64 {
    amount_kes * tax_type.rate_bps() / 10_000
}

// ── Request ────────────────────────────────────────────────────────────────────

#[derive(Debug, Serialize)]
#[serde(rename_all = "PascalCase")]
pub struct TaxRemittanceRequest {
    pub initiator:                  String,
    pub security_credential:        String,
    pub command_i_d:                String,    // "TaxRemmittance"  (Daraja typo — keep it)
    pub sender_identifier_type:     String,    // "4" = shortcode
    pub receiver_identifier_type:   String,    // "4" = KRA shortcode
    pub amount:                     u64,
    pub party_a:                    String,    // your shortcode
    pub party_b:                    String,    // KRA shortcode (572572 for sandbox)
    pub account_reference:          String,    // tax obligation account / PRN
    pub queue_timeout_u_r_l:        String,
    pub result_u_r_l:               String,
    pub remarks:                    String,
}

// ── Immediate ACK ──────────────────────────────────────────────────────────────

#[derive(Debug, Deserialize)]
#[serde(rename_all = "PascalCase")]
pub struct TaxRemittanceAck {
    pub originator_conversation_id: String,
    pub conversation_id:            String,
    pub response_code:              String,
    pub response_description:       String,
}

// ── Result Callback (Daraja → our server) ─────────────────────────────────────

#[derive(Debug, Deserialize)]
#[serde(rename_all = "PascalCase")]
pub struct TaxRemittanceResult {
    pub result: TaxResultBody,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "PascalCase")]
pub struct TaxResultBody {
    pub result_type:                i32,
    pub result_code:                i32,    // 0 = success
    pub result_desc:                String,
    pub originator_conversation_id: String,
    pub conversation_id:            String,
    pub transaction_i_d:            String,
    pub result_parameters:          Option<TaxResultParameters>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "PascalCase")]
pub struct TaxResultParameters {
    pub result_parameter: Vec<TaxResultItem>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "PascalCase")]
pub struct TaxResultItem {
    pub key:   String,
    pub value: Option<serde_json::Value>,
}

impl TaxResultBody {
    pub fn is_success(&self) -> bool {
        self.result_code == 0
    }

    pub fn debit_account_balance(&self) -> Option<String> {
        self.result_parameters
            .as_ref()
            .and_then(|p| {
                p.result_parameter
                    .iter()
                    .find(|i| i.key == "DebitAccountBalance")
                    .and_then(|i| i.value.as_ref())
                    .map(|v| match v {
                        serde_json::Value::String(s) => s.clone(),
                        other => other.to_string(),
                    })
            })
    }
}

// ── API Call ───────────────────────────────────────────────────────────────────

impl DarajaClient {
    /// Remit tax to KRA before paying out seller.
    ///
    /// `originator_id`    escrow_id — used to match result callback
    /// `amount_kes`       gross tax amount to remit (whole KES)
    /// `kra_shortcode`    KRA's Daraja shortcode ("572572" in sandbox)
    /// `account_ref`      PRN / payment registration number from KRA
    pub async fn remit_tax(
        &self,
        originator_id: &str,
        amount_kes:    u64,
        kra_shortcode: &str,
        account_ref:   &str,
    ) -> Result<TaxRemittanceAck, DarajaError> {
        let token = self.access_token().await?;
        let url = format!("{}/mpesa/b2b/v1/remittax", self.base_url);

        let body = TaxRemittanceRequest {
            initiator:                self.initiator_name.clone(),
            security_credential:      self.security_cred.clone(),
            command_i_d:              "TaxRemmittance".into(),    // Daraja typo — exact match required
            sender_identifier_type:   "4".into(),
            receiver_identifier_type: "4".into(),
            amount:                   amount_kes,
            party_a:                  self.shortcode.clone(),
            party_b:                  kra_shortcode.to_string(),
            account_reference:        account_ref.to_string(),
            queue_timeout_u_r_l:      format!("{}/daraja/tax/timeout", self.callback_base),
            result_u_r_l:             format!("{}/daraja/tax/result", self.callback_base),
            remarks:                  format!("Escrow tax remittance {}", originator_id),
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
                "Tax remittance failed {}: {}",
                status, body
            )));
        }

        resp.json::<TaxRemittanceAck>()
            .await
            .map_err(|e| DarajaError::Http(format!("Tax remittance ACK parse failed: {}", e)))
    }
}