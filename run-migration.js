#!/usr/bin/env node
/**
 * UG Souq Database Migration Script
 * Run: node run-migration.js
 * Or upload to Railway and run in console: node run-migration.js
 */

import mysql from 'mysql2/promise';

const SQL = `
-- ============================================
-- 1. ADD delivery columns to orders
-- ============================================
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS delivery_partner_id BIGINT UNSIGNED NULL AFTER payment_ref,
  ADD COLUMN IF NOT EXISTS delivery_assigned_at TIMESTAMP NULL AFTER delivery_partner_id,
  ADD COLUMN IF NOT EXISTS delivery_notes TEXT NULL AFTER delivery_assigned_at,
  ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP NULL AFTER delivery_notes;

-- ============================================
-- 2. CREATE payouts table
-- ============================================
CREATE TABLE IF NOT EXISTS payouts (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  seller_id BIGINT UNSIGNED NOT NULL,
  order_codes JSON NOT NULL,
  amount INT NOT NULL,
  payout_method VARCHAR(32) NOT NULL,
  payout_number VARCHAR(32) NOT NULL,
  status ENUM('pending','processing','completed','failed','rolled_back') NOT NULL DEFAULT 'pending',
  reference VARCHAR(128) NOT NULL UNIQUE,
  flutterwave_response JSON,
  processed_at TIMESTAMP NULL,
  failed_reason TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_seller_id (seller_id),
  INDEX idx_status (status)
);

-- ============================================
-- 3. CREATE platform_settings table
-- ============================================
CREATE TABLE IF NOT EXISTS platform_settings (
  id INT PRIMARY KEY DEFAULT 1,
  commission_rate DECIMAL(5,4) NOT NULL DEFAULT 0.0700,
  delivery_fee_base INT NOT NULL DEFAULT 3000,
  delivery_fee_per_km INT NOT NULL DEFAULT 500,
  platform_name VARCHAR(128) NOT NULL DEFAULT 'UG Souq',
  platform_email VARCHAR(255) DEFAULT 'support@ugsouq.com',
  enable_cash_on_delivery BOOLEAN NOT NULL DEFAULT TRUE,
  enable_mtn_momo BOOLEAN NOT NULL DEFAULT TRUE,
  enable_airtel_money BOOLEAN NOT NULL DEFAULT TRUE,
  min_order_amount INT NOT NULL DEFAULT 5000,
  free_delivery_threshold INT NOT NULL DEFAULT 100000,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
INSERT IGNORE INTO platform_settings (id) VALUES (1);

-- ============================================
-- 4. CREATE UG Souq Plus membership tables
-- ============================================
CREATE TABLE IF NOT EXISTS plus_memberships (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  customer_id BIGINT UNSIGNED NOT NULL UNIQUE,
  plan VARCHAR(32) NOT NULL DEFAULT 'monthly',
  status ENUM('pending','active','expired','cancelled','payment_failed') NOT NULL DEFAULT 'pending',
  starts_at TIMESTAMP NULL,
  expires_at TIMESTAMP NULL,
  provider VARCHAR(32) NULL,
  provider_reference VARCHAR(128) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS plus_payments (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  customer_id BIGINT UNSIGNED NOT NULL,
  membership_id BIGINT UNSIGNED NULL,
  reference VARCHAR(128) NOT NULL UNIQUE,
  transaction_id VARCHAR(128) NULL,
  amount INT NOT NULL,
  currency VARCHAR(8) NOT NULL DEFAULT 'UGX',
  status ENUM('pending','successful','failed','cancelled') NOT NULL DEFAULT 'pending',
  provider_response JSON NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  verified_at TIMESTAMP NULL,
  INDEX idx_plus_payments_customer (customer_id)
);

-- ============================================
-- 5. CREATE seller_contracts table
-- ============================================
CREATE TABLE IF NOT EXISTS seller_contracts (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  seller_id BIGINT UNSIGNED NOT NULL,
  contract_type ENUM('seller_agreement','commission_terms','delivery_terms') NOT NULL,
  version VARCHAR(16) NOT NULL DEFAULT '1.0',
  accepted BOOLEAN NOT NULL DEFAULT FALSE,
  accepted_at TIMESTAMP NULL,
  accepted_by ENUM('seller','admin') NOT NULL DEFAULT 'seller',
  admin_key_hash VARCHAR(64) NULL,
  ip_address VARCHAR(45) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_seller_contract (seller_id, contract_type)
);

-- ============================================
-- 5. CREATE notifications table
-- ============================================
CREATE TABLE IF NOT EXISTS notifications (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  type ENUM('new_order','payment_received','seller_registered','delivery_partner_registered','payout_completed','payout_failed','listing_pending','order_cancelled','low_stock') NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  entity_type VARCHAR(64) NULL,
  entity_id VARCHAR(64) NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 6. CREATE returns table
-- ============================================
CREATE TABLE IF NOT EXISTS returns (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_id BIGINT UNSIGNED NOT NULL,
  order_code VARCHAR(16) NOT NULL,
  customer_name VARCHAR(255) NOT NULL,
  customer_phone VARCHAR(32) NOT NULL,
  reason TEXT NOT NULL,
  status ENUM('requested','approved','rejected','picked_up','refunded','closed') NOT NULL DEFAULT 'requested',
  refund_amount INT NOT NULL DEFAULT 0,
  admin_notes TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP NULL
);

-- ============================================
-- 7. ADD INDEXES for performance
-- ============================================
ALTER TABLE orders ADD INDEX IF NOT EXISTS idx_payment_status (payment_status);
ALTER TABLE sellers ADD INDEX IF NOT EXISTS idx_status (status);
ALTER TABLE listings ADD INDEX IF NOT EXISTS idx_status (status);
`;

async function run() {
  const url = process.env.MYSQL_URL || process.env.DATABASE_URL;
  if (!url) {
    console.error('❌ No MYSQL_URL or DATABASE_URL found in environment variables.');
    console.error('   Make sure you run this in the Railway environment.');
    process.exit(1);
  }

  console.log('🔌 Connecting to database...');
  const conn = await mysql.createConnection(url);

  console.log('🚀 Running migration...');
  const statements = SQL.split(';').map(s => s.trim()).filter(s => s.length > 0);

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i] + ';';
    try {
      await conn.query(stmt);
      console.log(`✅ [${i + 1}/${statements.length}] OK`);
    } catch (err) {
      // Ignore "duplicate column" and "table already exists" errors
      const msg = String(err.message || err);
      if (msg.includes('Duplicate column') || msg.includes('already exists') || msg.includes('Duplicate entry')) {
        console.log(`⚠️  [${i + 1}/${statements.length}] Already exists (skipped)`);
      } else {
        console.error(`❌ [${i + 1}/${statements.length}] FAILED: ${msg}`);
      }
    }
  }

  await conn.end();
  console.log('🎉 Migration complete!');
}

run().catch(err => {
  console.error('💥 Fatal error:', err.message);
  process.exit(1);
});

