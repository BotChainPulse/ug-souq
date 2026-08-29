import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";

const ADMIN_KEY = process.env.ADMIN_KEY ?? "ugsouq-admin-2026";

export const migrateRouter = createRouter({
  runMigration: publicQuery
    .input(z.object({ key: z.string() }))
    .query(async ({ input }) => {
      if (input.key !== ADMIN_KEY) {
        return { ok: false, error: "Invalid admin key" };
      }

      const db = getDb();
      const results: string[] = [];

      const run = async (label: string, sql: string) => {
        try {
          await db.execute(sql);
          results.push("OK: " + label);
        } catch (err: any) {
          const msg = err?.message || String(err);
          if (msg.includes("Duplicate column") || msg.includes("already exists") || msg.includes("Duplicate entry")) {
            results.push("SKIP (exists): " + label);
          } else {
            results.push("ERR: " + label + " -> " + msg.slice(0, 200));
          }
        }
      };

      // 1. Add columns to orders (without IF NOT EXISTS - handle errors)
      await run("orders.delivery_partner_id", "ALTER TABLE orders ADD COLUMN delivery_partner_id BIGINT UNSIGNED NULL AFTER payment_ref");
      await run("orders.delivery_assigned_at", "ALTER TABLE orders ADD COLUMN delivery_assigned_at TIMESTAMP NULL AFTER delivery_partner_id");
      await run("orders.delivery_notes", "ALTER TABLE orders ADD COLUMN delivery_notes TEXT NULL AFTER delivery_assigned_at");
      await run("orders.delivered_at", "ALTER TABLE orders ADD COLUMN delivered_at TIMESTAMP NULL AFTER delivery_notes");

      // 2. Create payouts table
      await run("payouts", `
        CREATE TABLE payouts (
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
        )
      `);

      // 3. Create platform_settings table
      await run("platform_settings", `
        CREATE TABLE platform_settings (
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
        )
      `);
      await run("platform_settings.insert", "INSERT INTO platform_settings (id) VALUES (1) ON DUPLICATE KEY UPDATE id = id");

      await run("plus_memberships", `
        CREATE TABLE plus_memberships (
          id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
          customer_id BIGINT UNSIGNED NOT NULL UNIQUE,
          plan VARCHAR(32) NOT NULL DEFAULT 'monthly',
          status ENUM('pending','active','expired','cancelled','payment_failed') NOT NULL DEFAULT 'pending',
          starts_at TIMESTAMP NULL, expires_at TIMESTAMP NULL,
          provider VARCHAR(32) NULL, provider_reference VARCHAR(128) NULL,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
      `);
      await run("plus_payments", `
        CREATE TABLE plus_payments (
          id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
          customer_id BIGINT UNSIGNED NOT NULL, membership_id BIGINT UNSIGNED NULL,
          reference VARCHAR(128) NOT NULL UNIQUE, transaction_id VARCHAR(128) NULL,
          amount INT NOT NULL, currency VARCHAR(8) NOT NULL DEFAULT 'UGX',
          status ENUM('pending','successful','failed','cancelled') NOT NULL DEFAULT 'pending',
          provider_response JSON NULL, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          verified_at TIMESTAMP NULL, INDEX idx_plus_payments_customer (customer_id)
        )
      `);

      // 4. Create seller_contracts table
      await run("seller_contracts", `
        CREATE TABLE seller_contracts (
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
        )
      `);

      // 5. Create notifications table
      await run("notifications", `
        CREATE TABLE notifications (
          id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
          type ENUM('new_order','payment_received','seller_registered','delivery_partner_registered','payout_completed','payout_failed','listing_pending','order_cancelled','low_stock') NOT NULL,
          title VARCHAR(255) NOT NULL,
          message TEXT NOT NULL,
          entity_type VARCHAR(64) NULL,
          entity_id VARCHAR(64) NULL,
          is_read BOOLEAN NOT NULL DEFAULT FALSE,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // 6. Create returns table
      await run("returns", `
        CREATE TABLE returns (
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
        )
      `);

      return { ok: true, results };
    }),
});

