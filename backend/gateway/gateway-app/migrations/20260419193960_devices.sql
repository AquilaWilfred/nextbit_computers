-- Create devices table
CREATE TABLE devices (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id       VARCHAR(30) UNIQUE NOT NULL,
    serial          VARCHAR(100),
    machine_id      VARCHAR(100),
    mac_addresses   TEXT[],
    manufacturer    VARCHAR(100),
    model           VARCHAR(150),
    shop_id         UUID,
    created_at      TIMESTAMPTZ DEFAULT now(),
    last_seen       TIMESTAMPTZ DEFAULT now()
);

-- Create scans table
CREATE TABLE scans (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id       UUID REFERENCES devices(id) ON DELETE CASCADE,
    scan_id         VARCHAR(36) UNIQUE NOT NULL,
    data            JSONB NOT NULL,
    created_at      TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_devices_machine_id ON devices(machine_id);
CREATE INDEX idx_devices_serial ON devices(serial);
CREATE INDEX idx_scans_device_id ON scans(device_id);
CREATE INDEX idx_scans_created_at ON scans(created_at);