-- Ensure uuid-ossp extension is available
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Set default for openId so email-registered users always get one
ALTER TABLE users ALTER COLUMN "openId" SET DEFAULT uuid_generate_v4()::text;
