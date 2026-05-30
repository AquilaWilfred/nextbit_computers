use redis::Client as RedisClient;
use sqlx::PgPool;
use mongodb::Database;
use std::sync::Arc;

use crate::daraja::DarajaClient;
use crate::services::flutterwave::FlutterwaveClient;


#[derive(Clone)]
pub struct AppState {
    pub pg:                  PgPool,
    pub mongo:               Database,
    pub redis:               Arc<RedisClient>,
    pub ml:                  reqwest::Client,
    pub http_client:         reqwest::Client,
    pub flutterwave:         FlutterwaveClient,
    pub daraja:              DarajaClient,
    pub catalogue_url:       String,
    pub ml_url:              String,
    pub internal_api_key:    String,
}
