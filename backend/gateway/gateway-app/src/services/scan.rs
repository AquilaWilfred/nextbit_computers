use crate::models::probe::Scan;
use sqlx::PgPool;
use uuid::Uuid;
use serde_json::Value;

pub async fn insert_scan(
    pool: &PgPool,
    device_id: Uuid,
    scan_id: String,
    data: Value,
) -> Result<Scan, Box<dyn std::error::Error>> {
    let scan = sqlx::query_as::<_, Scan>(
        r#"
        INSERT INTO scans (device_id, scan_id, data)
        VALUES ($1, $2, $3)
        RETURNING id, device_id, scan_id, data, created_at
        "#
    )
    .bind(device_id)
    .bind(scan_id)
    .bind(data)
    .fetch_one(pool)
    .await?;

    Ok(scan)
}