-- Align lpos table with the current LPO model.
-- Adds missing numeric totals, shipping cost and audit fields.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(c.conkey)
    WHERE t.relname = 'lpos'
      AND a.attname = 'company_id'
      AND c.contype = 'f'
  ) THEN
    ALTER TABLE lpos DROP CONSTRAINT IF EXISTS lpos_company_id_fkey;
  END IF;
END $$;

ALTER TABLE lpos
  ALTER COLUMN company_id TYPE VARCHAR USING company_id::text,
  ALTER COLUMN amount TYPE NUMERIC(10,2) USING amount::numeric,
  ALTER COLUMN tax_amount TYPE NUMERIC(10,2) USING tax_amount::numeric;

ALTER TABLE lpos
  ADD COLUMN IF NOT EXISTS total_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS shipping_cost NUMERIC(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS created_by VARCHAR NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS approved_by VARCHAR,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS notes TEXT;
