use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Deserialize, Serialize)]
pub struct ProbeSubmit {
    pub device_id: Option<String>,
    pub machine_id: Option<String>,
    pub serial: Option<String>,
    pub mac_addresses: Option<Vec<String>>,
    pub manufacturer: Option<String>,
    pub model: Option<String>,
    pub shop_id: Option<Uuid>,
    pub timestamp: String,
    pub score: Score,
    pub system: serde_json::Value,
    pub battery: serde_json::Value,
    pub cpu_throttle: serde_json::Value,
    pub ram_test: serde_json::Value,
    pub disks: serde_json::Value,
    pub gpu: serde_json::Value,
    pub temperature: serde_json::Value,
    pub network: serde_json::Value,
    pub peripherals: serde_json::Value,
    pub security: serde_json::Value,
    pub performance: serde_json::Value,
    pub events: serde_json::Value,
    pub display: serde_json::Value,
    pub oem: serde_json::Value,
    pub probe_version: String,
    pub os_type: String,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct Score {
    pub pct: u32,
    pub overall: String,
    pub checks: Vec<Check>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct Check {
    pub name: String,
    pub passed: bool,
    pub detail: String,
    pub weight: u32,
}

#[derive(Debug, Serialize)]
pub struct ProbeResponse {
    pub device_id: String,
    pub scan_id: String,
    pub is_new_device: bool,
}

#[derive(Debug, Deserialize, Serialize, sqlx::FromRow)]
pub struct Device {
    pub id: Uuid,
    pub device_id: String,
    pub serial: Option<String>,
    pub machine_id: Option<String>,
    pub mac_addresses: Option<Vec<String>>,
    pub manufacturer: Option<String>,
    pub model: Option<String>,
    pub shop_id: Option<Uuid>,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub last_seen: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Deserialize, Serialize, sqlx::FromRow)]
pub struct Scan {
    pub id: Uuid,
    pub device_id: Uuid,
    pub scan_id: String,
    pub data: serde_json::Value,
    pub created_at: chrono::DateTime<chrono::Utc>,
}