ALTER TYPE orderstatus ADD VALUE IF NOT EXISTS 'processing';
ALTER TYPE orderstatus ADD VALUE IF NOT EXISTS 'payment_confirmed';
ALTER TYPE orderstatus ADD VALUE IF NOT EXISTS 'out_for_delivery';
ALTER TYPE orderstatus ADD VALUE IF NOT EXISTS 'refunded';
