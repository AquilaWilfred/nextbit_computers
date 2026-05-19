use crate::models::probe::{Device, ProbeSubmit};
use sqlx::PgPool;
use uuid::Uuid;

pub async fn upsert_device(
    pool: &PgPool,
    probe: &ProbeSubmit,
    shop_id: Uuid,
) -> Result<(Device, bool), Box<dyn std::error::Error>> {

    // Normalize — treat "N/A", empty string, and NULL all as None
    let machine_id = probe.machine_id.as_deref()
        .filter(|s| !s.is_empty() && *s != "N/A");
    let serial = probe.serial.as_deref()
        .filter(|s| !s.is_empty() && *s != "N/A"
            && *s != "To be filled by O.E.M."
            && *s != "Default string");

    // Only attempt match if we have at least one real identifier
    let existing = if machine_id.is_some() || serial.is_some() {
        sqlx::query_as::<_, Device>(
            r#"
            SELECT id, device_id, serial, machine_id, mac_addresses,
                   manufacturer, model, shop_id, created_at, last_seen
            FROM devices
            WHERE
                ($1::text IS NOT NULL AND machine_id = $1)
                OR
                ($2::text IS NOT NULL AND serial = $2)
            LIMIT 1
            "#
        )
        .bind(machine_id)
        .bind(serial)
        .fetch_optional(pool)
        .await?
    } else {
        None  // No valid identifiers — always create new device
    };

    if let Some(mut device) = existing {
        sqlx::query("UPDATE devices SET last_seen = NOW() WHERE id = $1")
            .bind(device.id)
            .execute(pool)
            .await?;
        device.last_seen = chrono::Utc::now();
        Ok((device, false))
    } else {
        // Generate a proper unique device_id
        let suffix = format!("{:04X}", (Uuid::new_v4().as_u128() as u16));
        let device_id = format!("NB-KE-NBI-{:06}-{}", 
            rand_device_counter(pool).await?,
            suffix
        );

        let device = sqlx::query_as::<_, Device>(
            r#"
            INSERT INTO devices 
                (device_id, serial, machine_id, mac_addresses, manufacturer, model, shop_id)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING id, device_id, serial, machine_id, mac_addresses,
                      manufacturer, model, shop_id, created_at, last_seen
            "#
        )
        .bind(device_id)
        .bind(serial)          // store normalized (no "N/A")
        .bind(machine_id)      // store normalized
        .bind(&probe.mac_addresses)
        .bind(&probe.manufacturer)
        .bind(&probe.model)
        .bind(shop_id)
        .fetch_one(pool)
        .await?;

        Ok((device, true))
    }
}

// Get next device sequence number from DB
async fn rand_device_counter(pool: &PgPool) -> Result<i64, Box<dyn std::error::Error>> {
    let row: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM devices")
        .fetch_one(pool)
        .await?;
    Ok(row.0 + 1)
}