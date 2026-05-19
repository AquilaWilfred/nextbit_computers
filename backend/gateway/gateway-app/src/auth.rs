use anyhow::Result;
use jsonwebtoken::{decode, DecodingKey, Validation};
use crate::models::Claims;

fn jwt_secret() -> String {
    std::env::var("SECRET_KEY").unwrap_or_else(|_| "nextbit-secret-key-2026-change-in-production".to_string())
}

pub fn verify_jwt(token: &str) -> Result<String> {
    let secret = jwt_secret();
    tracing::debug!("verify_jwt: secret='{}' token='{}'", secret, &token[..20]);
    let result = decode::<Claims>(
        token,
        &DecodingKey::from_secret(secret.as_bytes()),
        &Validation::default(),
    );
    match result {
        Ok(data) => {
            tracing::debug!("verify_jwt: OK sub={}", data.claims.sub);
            Ok(data.claims.sub)
        }
        Err(e) => {
            tracing::error!("verify_jwt FAILED: {:?}", e);
            Err(e.into())
        }
    }
}
