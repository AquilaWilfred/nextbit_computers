-- Add user_id FK to b2b_applications
ALTER TABLE b2b_applications ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id);
CREATE INDEX IF NOT EXISTS ix_b2b_applications_user_id ON b2b_applications(user_id);
