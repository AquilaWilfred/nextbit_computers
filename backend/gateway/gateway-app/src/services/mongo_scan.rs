use mongodb::bson::{doc, Document};
use mongodb::Collection;
use serde_json::Value;

pub async fn insert_scan_mongo(
    collection: &Collection<Document>,
    device_id: &str,
    scan_id: &str,
    data: Value,
) -> Result<(), Box<dyn std::error::Error>> {
    let now = chrono::Utc::now();
    let doc = doc! {
        "device_id": device_id,
        "scan_id": scan_id,
        "data": mongodb::bson::to_bson(&data)?,
        "created_at": mongodb::bson::DateTime::from_millis(now.timestamp_millis()),
    };
    collection.insert_one(doc).await?;
    Ok(())
}