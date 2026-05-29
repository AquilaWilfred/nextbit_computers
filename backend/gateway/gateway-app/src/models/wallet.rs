// ── src/models/wallet.rs ───────────────────────────────────────────────────────

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

use crate::services::fee::PaymentMethod;

// ── DB Rows ────────────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct NextbitCard {
    pub id:            Uuid,
    pub user_id:       Uuid,
    pub card_number:   String,
    pub card_holder:   String,
    pub expiry_month:  i16,
    pub expiry_year:   i16,
    pub balance_cents: i64,
    pub fw_van:        Option<String>,
    pub fw_van_bank:   Option<String>,
    pub fw_van_ref:    Option<String>,
    pub is_active:     bool,
    pub created_at:    DateTime<Utc>,
    pub updated_at:    DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::Type, PartialEq)]
#[sqlx(type_name = "wallet_tx_type", rename_all = "snake_case")]
pub enum WalletTxType {
    LoadMpesa,
    LoadCard,
    LoadBank,
    OrderPayment,
    OrderRefund,
    SellerPayout,
    Withdrawal,
    PlatformFee,
    FwFeeShare,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::Type, PartialEq)]
#[sqlx(type_name = "wallet_tx_status", rename_all = "snake_case")]
pub enum WalletTxStatus {
    Pending,
    Completed,
    Failed,
    Reversed,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct WalletTransaction {
    pub id:             Uuid,
    pub card_id:        Uuid,
    pub user_id:        Uuid,
    pub tx_type:        WalletTxType,
    pub status:         WalletTxStatus,
    pub amount_cents:   i64,
    pub fee_cents:      i64,
    pub net_cents:      i64,
    pub balance_before: i64,
    pub balance_after:  i64,
    pub escrow_id:      Option<Uuid>,
    pub fw_tx_ref:      Option<String>,
    pub fw_charge_id:   Option<String>,
    pub description:    Option<String>,
    pub created_at:     DateTime<Utc>,
    pub updated_at:     DateTime<Utc>,
}

// ── Request / Response DTOs ────────────────────────────────────────────────────

#[derive(Debug, Deserialize)]
pub struct LoadWalletRequest {
    pub amount_kes:    f64,
    pub method:        PaymentMethod,
    pub phone_number:  Option<String>,  // required for M-Pesa
}

#[derive(Debug, Deserialize)]
pub struct PayOrderRequest {
    pub escrow_id:  Uuid,
    pub amount_kes: f64,
    // no method — order payment is ALWAYS from wallet
    // method only applies at load time
}

#[derive(Debug, Deserialize)]
pub struct WithdrawRequest {
    pub amount_kes:    f64,
    pub bank_code:     Option<String>,
    pub account_number:Option<String>,
    pub phone_number:  Option<String>,  // for M-Pesa withdrawal
}

#[derive(Debug, Serialize)]
pub struct CardResponse {
    pub id:             Uuid,
    pub card_number:    String,         // masked: NB43 **** **** 1234
    pub card_holder:    String,
    pub expiry:         String,         // "MM/YY"
    pub balance_kes:    f64,
    pub has_van:        bool,
    pub fw_van:         Option<String>,
    pub fw_van_bank:    Option<String>,
}

impl From<NextbitCard> for CardResponse {
    fn from(c: NextbitCard) -> Self {
        let masked = format!(
            "{} **** **** {}",
            &c.card_number[..4],
            &c.card_number[12..]
        );
        Self {
            id:          c.id,
            card_number: masked,
            card_holder: c.card_holder,
            expiry:      format!("{:02}/{}", c.expiry_month, c.expiry_year % 100),
            balance_kes: c.balance_cents as f64 / 100.0,
            has_van:     c.fw_van.is_some(),
            fw_van:      c.fw_van,
            fw_van_bank: c.fw_van_bank,
        }
    }
}

#[derive(Debug, Serialize)]
pub struct WalletTxResponse {
    pub id:           Uuid,
    pub tx_type:      WalletTxType,
    pub status:       WalletTxStatus,
    pub amount_kes:   f64,
    pub fee_kes:      f64,
    pub net_kes:      f64,
    pub balance_kes:  f64,
    pub description:  Option<String>,
    pub created_at:   DateTime<Utc>,
}

impl From<WalletTransaction> for WalletTxResponse {
    fn from(t: WalletTransaction) -> Self {
        Self {
            id:          t.id,
            tx_type:     t.tx_type,
            status:      t.status,
            amount_kes:  t.amount_cents  as f64 / 100.0,
            fee_kes:     t.fee_cents     as f64 / 100.0,
            net_kes:     t.net_cents     as f64 / 100.0,
            balance_kes: t.balance_after as f64 / 100.0,
            description: t.description,
            created_at:  t.created_at,
        }
    }
}

#[derive(Debug, Serialize)]
pub struct FeePreviewResponse {
    pub gross_kes:        f64,
    pub fw_fee_kes:       f64,   // always 0 for wallet payments
    pub platform_fee_kes: f64,   // nextbit tiered fee from seller
    pub buyer_pays_kes:   f64,   // always = gross (no extra charge)
    pub seller_gets_kes:  f64,   // after platform fee deducted
}

#[derive(Debug, Serialize)]
pub struct LoadFeePreviewResponse {
    pub you_send_kes:     f64,   // what customer inputs
    pub fw_fee_kes:       f64,   // flutterwave takes this
    pub wallet_credit_kes:f64,   // what lands in wallet
    pub method:           String,
}