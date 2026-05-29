use serde::{Deserialize, Serialize};
use serde_json::Value;

pub mod probe;
pub mod escrow;

#[derive(Debug, Serialize, Deserialize)]
pub struct HardwareReport {
    pub device_id:    String,
    pub submitted_at: Option<String>,
    pub hardware:     Value,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct NetworkReport {
    pub device_id:        String,
    pub capture_duration: u64,
    pub summary:          Value,
    pub connections:      Value,
    pub flows:            Value,
    pub threat_hits:      Value,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AssetRequest {
    pub device_id: String,
    pub label:     Option<String>,
    pub owner:     Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AssetUpdate {
    pub label: Option<String>,
    pub owner: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct LoginRequest {
    pub email:    String,
    pub password: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct RegisterRequest {
    pub email:    String,
    pub password: String,
    pub name:     String,
}



#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Claims {
    pub sub: String,
    pub exp: usize,
    pub role: Option<String>,
    pub company_id: Option<String>,
}
