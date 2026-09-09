-- One storefront and one admin ledger, while keeping both interfaces separate.
ALTER TABLE order_items ADD COLUMN seller_id BIGINT UNSIGNED NULL;
ALTER TABLE order_items ADD COLUMN commission_rate DECIMAL(5,4) NOT NULL DEFAULT 0.0000;
ALTER TABLE order_items ADD COLUMN commission_fee INT NOT NULL DEFAULT 0;
ALTER TABLE order_items ADD COLUMN seller_net INT NOT NULL DEFAULT 0;
ALTER TABLE listings MODIFY COLUMN status ENUM('pending','approved','rejected','suspended','terminated') NOT NULL DEFAULT 'pending';

CREATE TABLE IF NOT EXISTS seller_subscriptions (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  seller_id BIGINT UNSIGNED NOT NULL UNIQUE,
  tier ENUM('free','basic','verified','premium') NOT NULL DEFAULT 'free',
  monthly_fee INT NOT NULL DEFAULT 0,
  commission_rate DECIMAL(5,2) NOT NULL DEFAULT 7.00,
  features JSON NULL,
  started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NULL,
  is_active BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS seller_plan_payments (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  seller_id BIGINT UNSIGNED NOT NULL,
  plan ENUM('pro') NOT NULL DEFAULT 'pro',
  months INT NOT NULL DEFAULT 1,
  amount INT NOT NULL,
  payment_reference VARCHAR(128) NOT NULL UNIQUE,
  status ENUM('confirmed','refunded') NOT NULL DEFAULT 'confirmed',
  confirmed_by VARCHAR(64) NOT NULL DEFAULT 'admin-review',
  confirmed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
