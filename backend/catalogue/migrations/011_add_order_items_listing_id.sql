-- Add listingId to order_items for trade-in order item support
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS "listingId" INTEGER;
