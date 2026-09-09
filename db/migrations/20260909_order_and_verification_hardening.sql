-- Separate seller listings from catalogue products in persisted order lines.
ALTER TABLE order_items
  MODIFY COLUMN item_type ENUM('product','listing','menu_item') NOT NULL;

-- Verification is an evidenced decision, separate from allowing a shop to operate.
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS identity_checked_at TIMESTAMP NULL;
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS location_checked_at TIMESTAMP NULL;
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP NULL;
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS verified_by VARCHAR(64) NULL;
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS verification_notes TEXT NULL;
