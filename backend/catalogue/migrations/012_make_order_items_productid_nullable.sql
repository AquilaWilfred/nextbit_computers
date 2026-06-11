-- Allow order items to store trade-in listing items without a productId
ALTER TABLE order_items ALTER COLUMN "productId" DROP NOT NULL;
