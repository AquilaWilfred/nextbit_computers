use redis::Client as RedisClient;
use std::sync::Arc;

pub async fn with_redis<F, T>(client: Arc<RedisClient>, f: F) -> redis::RedisResult<T>
where
    F: FnOnce(&mut redis::Connection) -> redis::RedisResult<T> + Send + 'static,
    T: Send + 'static,
{
    tokio::task::spawn_blocking(move || {
        let mut conn = client.get_connection()?;
        f(&mut conn)
    })
    .await
    .unwrap_or_else(|e| Err(redis::RedisError::from((
        redis::ErrorKind::IoError,
        "spawn_blocking failed",
        e.to_string(),
    ))))
}
