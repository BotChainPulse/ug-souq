-- Additive migration; startup skips duplicate columns on repeated boots.
ALTER TABLE products ADD COLUMN product_type VARCHAR(24) NULL;
ALTER TABLE products ADD COLUMN requires_size BOOLEAN NULL;
ALTER TABLE products ADD COLUMN specifications TEXT NULL;
ALTER TABLE listings ADD COLUMN product_type VARCHAR(24) NULL;
ALTER TABLE listings ADD COLUMN requires_size BOOLEAN NULL;
ALTER TABLE listings ADD COLUMN specifications TEXT NULL;
ALTER TABLE order_items ADD COLUMN configuration TEXT NULL;

-- Correct the known legacy misclassification without inventing size stock.
UPDATE products SET category = 'shoes', product_type = 'footwear', requires_size = TRUE WHERE slug = 'running-sneakers' AND category = 'sports' AND product_type IS NULL;
