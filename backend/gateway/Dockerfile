# ── Stage 1: Build ──────────────────────────────────────────────────────────
FROM rust:1.88-slim AS builder

RUN apt-get update && apt-get install -y --no-install-recommends \
    pkg-config \
    libssl-dev \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY Cargo.toml Cargo.lock ./
COPY gateway-app/Cargo.toml ./gateway-app/Cargo.toml

RUN mkdir -p gateway-app/src && echo "fn main() {}" > gateway-app/src/main.rs
RUN cargo build --release --bin gateway 2>/dev/null || true
RUN rm -rf gateway-app/src

COPY gateway-app/src ./gateway-app/src
RUN touch gateway-app/src/main.rs
RUN cargo build --release --bin gateway

# ── Stage 2: Runtime ────────────────────────────────────────────────────────
FROM debian:bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    libssl3 \
    libpq5 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY --from=builder /app/target/release/gateway ./gateway
EXPOSE 8080
CMD ["./gateway"]
