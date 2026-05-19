CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS probe_reports (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    device_id    TEXT NOT NULL,
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    payload      JSONB NOT NULL
);

CREATE TABLE IF NOT EXISTS assets (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    device_id  TEXT UNIQUE NOT NULL,
    label      TEXT,
    owner      TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS network_summaries (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    device_id         TEXT NOT NULL,
    captured_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    total_connections INT NOT NULL DEFAULT 0,
    total_flows       INT NOT NULL DEFAULT 0,
    total_bytes       BIGINT NOT NULL DEFAULT 0,
    threat_hit_count  INT NOT NULL DEFAULT 0
);