-- Support manual product entry in LPO items
-- Makes product_id nullable and adds manual product name/category fields

ALTER TABLE lpo_items
  ALTER COLUMN product_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS product_name VARCHAR,
  ADD COLUMN IF NOT EXISTS product_category VARCHAR;
