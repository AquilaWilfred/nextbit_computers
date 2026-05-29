-- 010_add_tradein_visible.sql
-- Add `visible` column to trade_in_listings to support hiding listings from marketplace

ALTER TABLE trade_in_listings
ADD COLUMN IF NOT EXISTS visible boolean DEFAULT true;

-- Ensure existing rows are visible by default
UPDATE trade_in_listings SET visible = true WHERE visible IS NULL;

-- Commit is handled by run_migrations.py
