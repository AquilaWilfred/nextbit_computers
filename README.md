# Escrow Payment System — File Map

## Where each file goes in your project

| Generated file            | Paste to                                          |
|---------------------------|---------------------------------------------------|
| 20260501000001_escrow.sql | gateway-app/migrations/                           |
| escrow_models.rs          | gateway-app/src/models/escrow.rs                  |
| escrow_service.rs         | gateway-app/src/services/escrow.rs                |
| flutterwave_service.rs    | gateway-app/src/services/flutterwave.rs           |
| escrow_handlers.rs        | gateway-app/src/handlers/escrow.rs                |
| escrow_routes.rs          | gateway-app/src/routes/escrow.rs                  |
| cargo_additions.toml      | merge into gateway-app/Cargo.toml [dependencies]  |

## Wire up in main.rs

```rust
mod models  { pub mod escrow; }
mod services{ pub mod escrow; pub mod flutterwave; }
mod handlers{ pub mod escrow; }
mod routes  { pub mod escrow; }

// in your router:
use routes::escrow::escrow_routes;

let app = Router::new()
    .merge(escrow_routes())
    // ... your existing routes
    .with_state(app_state);
```

## AppState needs these fields

```rust
pub struct AppState {
    pub db:          PgPool,
    pub http_client: reqwest::Client,   // add this
    pub config:      Config,
}

pub struct Config {
    pub flutterwave_secret: String,     // from env: FW_SECRET_KEY
}
```

## Run migration

```bash
sqlx migrate run --database-url $DATABASE_URL
```