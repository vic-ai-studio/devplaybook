---
title: "Rust for Backend Development: Complete Guide 2026"
description: "Rust backend development guide 2026: HTTP servers with Axum, database with SQLx, async with Tokio, error handling with anyhow/thiserror, testing, Docker deployment."
pubDate: "2026-04-02"
author: "DevPlaybook Team"
tags: ["Rust", "backend", "Axum", "SQLx", "Tokio", "async Rust", "web development"]
readingTime: "12 min read"
category: "rust"
---

Rust is now a serious choice for backend API development in 2026. The combination of Axum (HTTP), SQLx (database), Tokio (async), and serde (JSON) covers the full stack of a production REST API. This guide walks through building a complete, production-ready backend from scratch.

## Project Setup

```bash
cargo new backend-api --bin
cd backend-api

# Add dependencies
cargo add axum tokio serde serde_json sqlx anyhow thiserror tracing tracing-subscriber
cargo add --build sqlx --features "runtime-tokio-native-tls postgres macros migrate"
```

```toml
# Cargo.toml
[dependencies]
axum = { version = "0.8", features = ["macros"] }
tokio = { version = "1", features = ["full"] }
serde = { version = "1", features = ["derive"] }
serde_json = "1"
sqlx = { version = "0.8", features = [
    "runtime-tokio-native-tls",
    "postgres",
    "macros",
    "migrate",
    "uuid",
    "chrono",
] }
anyhow = "1"
thiserror = "2"
tracing = "0.1"
tracing-subscriber = { version = "0.3", features = ["env-filter"] }
uuid = { version = "1", features = ["v4", "serde"] }
chrono = { version = "0.4", features = ["serde"] }
dotenvy = "0.15"
```

---

## Async Fundamentals with Tokio

Tokio is Rust's most popular async runtime. It implements an M:N thread scheduler, async I/O, timers, and sync primitives.

```rust
use tokio::time::{sleep, Duration};
use tokio::sync::{Mutex, RwLock};
use std::sync::Arc;

#[tokio::main]
async fn main() {
    // Spawn concurrent tasks
    let handle1 = tokio::spawn(async {
        sleep(Duration::from_millis(100)).await;
        "task 1 done"
    });

    let handle2 = tokio::spawn(async {
        sleep(Duration::from_millis(50)).await;
        "task 2 done"
    });

    // Wait for both
    let (r1, r2) = tokio::join!(handle1, handle2);
    println!("{} {}", r1.unwrap(), r2.unwrap());
}

// Shared state with Arc<Mutex>
type SharedCache = Arc<RwLock<std::collections::HashMap<String, String>>>;

async fn read_cache(cache: &SharedCache, key: &str) -> Option<String> {
    let guard = cache.read().await;
    guard.get(key).cloned()
}

async fn write_cache(cache: &SharedCache, key: String, value: String) {
    let mut guard = cache.write().await;
    guard.insert(key, value);
}
```

---

## HTTP Server with Axum

### Application State

```rust
use axum::extract::FromRef;
use sqlx::PgPool;

#[derive(Clone)]
pub struct AppState {
    pub db: PgPool,
    pub config: Arc<Config>,
}

#[derive(Debug)]
pub struct Config {
    pub database_url: String,
    pub jwt_secret: String,
    pub port: u16,
}

impl Config {
    pub fn from_env() -> anyhow::Result<Self> {
        dotenvy::dotenv().ok();
        Ok(Config {
            database_url: std::env::var("DATABASE_URL")
                .context("DATABASE_URL must be set")?,
            jwt_secret: std::env::var("JWT_SECRET")
                .context("JWT_SECRET must be set")?,
            port: std::env::var("PORT")
                .unwrap_or_else(|_| "3000".to_string())
                .parse()
                .context("PORT must be a number")?,
        })
    }
}
```

### Route Handlers

```rust
use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use uuid::Uuid;

#[derive(Serialize, Deserialize)]
pub struct CreateUserRequest {
    pub name: String,
    pub email: String,
}

#[derive(Serialize, Deserialize, sqlx::FromRow)]
pub struct User {
    pub id: Uuid,
    pub name: String,
    pub email: String,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Deserialize)]
pub struct ListParams {
    pub page: Option<i64>,
    pub per_page: Option<i64>,
}

pub async fn create_user(
    State(state): State<AppState>,
    Json(payload): Json<CreateUserRequest>,
) -> Result<(StatusCode, Json<User>), AppError> {
    let user = sqlx::query_as!(
        User,
        r#"
        INSERT INTO users (id, name, email, created_at)
        VALUES ($1, $2, $3, NOW())
        RETURNING id, name, email, created_at
        "#,
        Uuid::new_v4(),
        payload.name,
        payload.email,
    )
    .fetch_one(&state.db)
    .await?;

    Ok((StatusCode::CREATED, Json(user)))
}

pub async fn get_user(
    State(state): State<AppState>,
    Path(user_id): Path<Uuid>,
) -> Result<Json<User>, AppError> {
    let user = sqlx::query_as!(
        User,
        "SELECT id, name, email, created_at FROM users WHERE id = $1",
        user_id,
    )
    .fetch_optional(&state.db)
    .await?
    .ok_or(AppError::NotFound)?;

    Ok(Json(user))
}

pub async fn list_users(
    State(state): State<AppState>,
    Query(params): Query<ListParams>,
) -> Result<Json<Vec<User>>, AppError> {
    let page = params.page.unwrap_or(1).max(1);
    let per_page = params.per_page.unwrap_or(20).min(100);
    let offset = (page - 1) * per_page;

    let users = sqlx::query_as!(
        User,
        "SELECT id, name, email, created_at FROM users ORDER BY created_at DESC LIMIT $1 OFFSET $2",
        per_page,
        offset,
    )
    .fetch_all(&state.db)
    .await?;

    Ok(Json(users))
}
```

---

## Database with SQLx

SQLx's killer feature: compile-time query verification. Queries are checked against an actual database during compilation.

### Migrations

```bash
# Install sqlx-cli
cargo install sqlx-cli --no-default-features --features postgres

# Create database
sqlx database create

# Create migration
sqlx migrate add create_users_table

# Run migrations
sqlx migrate run
```

```sql
-- migrations/20260402_create_users_table.sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_created_at ON users(created_at);
```

### Database Connection Pool

```rust
use sqlx::PgPool;

pub async fn create_pool(database_url: &str) -> anyhow::Result<PgPool> {
    let pool = sqlx::postgres::PgPoolOptions::new()
        .max_connections(20)
        .min_connections(5)
        .acquire_timeout(std::time::Duration::from_secs(5))
        .idle_timeout(std::time::Duration::from_secs(600))
        .connect(database_url)
        .await
        .context("Failed to connect to database")?;

    // Run pending migrations
    sqlx::migrate!("./migrations")
        .run(&pool)
        .await
        .context("Failed to run migrations")?;

    Ok(pool)
}
```

---

## Error Handling

### Library Errors with thiserror

```rust
use thiserror::Error;
use axum::{http::StatusCode, response::{IntoResponse, Response}, Json};

#[derive(Error, Debug)]
pub enum AppError {
    #[error("resource not found")]
    NotFound,

    #[error("validation error: {0}")]
    Validation(String),

    #[error("unauthorized")]
    Unauthorized,

    #[error("database error")]
    Database(#[from] sqlx::Error),

    #[error("internal error")]
    Internal(#[from] anyhow::Error),
}

#[derive(Serialize)]
struct ErrorResponse {
    error: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    detail: Option<String>,
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let (status, body) = match &self {
            AppError::NotFound => (
                StatusCode::NOT_FOUND,
                ErrorResponse { error: "not_found".into(), detail: None },
            ),
            AppError::Validation(msg) => (
                StatusCode::UNPROCESSABLE_ENTITY,
                ErrorResponse { error: "validation_error".into(), detail: Some(msg.clone()) },
            ),
            AppError::Unauthorized => (
                StatusCode::UNAUTHORIZED,
                ErrorResponse { error: "unauthorized".into(), detail: None },
            ),
            AppError::Database(e) => {
                tracing::error!("Database error: {:?}", e);
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    ErrorResponse { error: "internal_error".into(), detail: None },
                )
            }
            AppError::Internal(e) => {
                tracing::error!("Internal error: {:?}", e);
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    ErrorResponse { error: "internal_error".into(), detail: None },
                )
            }
        };
        (status, Json(body)).into_response()
    }
}
```

---

## Observability with Tracing

```rust
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt, EnvFilter};
use tower_http::trace::TraceLayer;

fn init_tracing() {
    tracing_subscriber::registry()
        .with(EnvFilter::try_from_default_env()
            .unwrap_or_else(|_| "backend_api=debug,tower_http=debug,axum=trace".into()))
        .with(tracing_subscriber::fmt::layer().json())
        .init();
}

// In handler
async fn create_user(/* ... */) -> Result<Json<User>, AppError> {
    tracing::info!(email = %payload.email, "Creating new user");

    let user = db_create_user(&state.db, &payload).await
        .map_err(|e| {
            tracing::error!(error = ?e, email = %payload.email, "Failed to create user");
            e
        })?;

    tracing::info!(user_id = %user.id, "User created successfully");
    Ok(Json(user))
}
```

---

## Testing

### Unit Tests

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_email_validation() {
        assert!(validate_email("user@example.com").is_ok());
        assert!(validate_email("not-an-email").is_err());
    }
}
```

### Integration Tests

```rust
// tests/api_tests.rs
use axum::body::Body;
use axum::http::{Request, StatusCode};
use tower::ServiceExt;

async fn setup_test_app() -> Router {
    let db = create_pool(&std::env::var("DATABASE_URL").unwrap()).await.unwrap();
    let config = Arc::new(Config { /* test config */ });
    let state = AppState { db, config };
    app_router(state)
}

#[tokio::test]
async fn test_create_user() {
    let app = setup_test_app().await;

    let response = app
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/users")
                .header("content-type", "application/json")
                .body(Body::from(r#"{"name":"Alice","email":"alice@test.com"}"#))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::CREATED);
}
```

---

## Docker Multi-Stage Build

```dockerfile
# Build stage
FROM rust:1.82-slim AS builder
WORKDIR /app

# Cache dependencies
COPY Cargo.toml Cargo.lock ./
RUN mkdir src && echo "fn main(){}" > src/main.rs
RUN cargo build --release
RUN rm src/main.rs

# Build application
COPY src ./src
COPY migrations ./migrations
RUN touch src/main.rs && cargo build --release

# Runtime stage
FROM debian:bookworm-slim AS runtime
RUN apt-get update && apt-get install -y ca-certificates libssl3 && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY --from=builder /app/target/release/backend-api /app/backend-api
COPY --from=builder /app/migrations /app/migrations

EXPOSE 3000
ENV RUST_LOG=info
CMD ["./backend-api"]
```

The final image is ~20MB — dramatically smaller than a Node.js deployment. The multi-stage build ensures build tools don't inflate the runtime image.

---

## Main Entry Point

```rust
#[tokio::main]
async fn main() -> anyhow::Result<()> {
    init_tracing();

    let config = Config::from_env()?;
    let pool = create_pool(&config.database_url).await?;
    let state = AppState {
        db: pool,
        config: Arc::new(config),
    };

    let app = Router::new()
        .nest("/api", api_router())
        .with_state(state)
        .layer(
            ServiceBuilder::new()
                .layer(TraceLayer::new_for_http())
                .layer(CorsLayer::permissive())
                .layer(TimeoutLayer::new(Duration::from_secs(30))),
        );

    let addr = format!("0.0.0.0:{}", state.config.port);
    let listener = tokio::net::TcpListener::bind(&addr).await?;
    tracing::info!("Server listening on {addr}");
    axum::serve(listener, app).await?;

    Ok(())
}
```

This guide covers the full lifecycle of a production Rust backend. The combination of Axum, SQLx, and Tokio gives you compile-time safety at every layer — from HTTP parsing to database queries.
