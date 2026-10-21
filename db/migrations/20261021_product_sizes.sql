-- Additive columns. The application startup migration tolerates duplicate-column
-- errors and also works on MySQL versions without IF NOT EXISTS.
ALTER TABLE products ADD COLUMN IF NOT EXISTS size_options TEXT NULL;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS size_options TEXT NULL;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS size VARCHAR(32) NULL;
-- Intentionally no backfill: aggregate stock does not establish actual size stock.
