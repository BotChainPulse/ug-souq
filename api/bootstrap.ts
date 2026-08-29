// One-time database bootstrap: creates tables and loads starter data.
// Called once after pointing DATABASE_URL at a fresh database; safe to re-run.
import { z } from "zod";
import { sql } from "drizzle-orm";
import { createRouter, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { runSeed } from "../db/seed";
import { syncDemoGroceries } from "./demoGroceries";

const BOOTSTRAP_KEY = "ugsouq-setup-2026";

const TABLES = [
  `CREATE TABLE IF NOT EXISTS sellers (
    \`id\` bigint unsigned NOT NULL AUTO_INCREMENT PRIMARY KEY,
    \`shop_name\` varchar(255) NOT NULL, \`owner_name\` varchar(255) NOT NULL, \`phone\` varchar(32) NOT NULL,
    \`email\` varchar(255), \`id_type\` varchar(64), \`id_number\` varchar(64), \`id_photo_name\` varchar(255),
    \`district\` varchar(64), \`landmark\` varchar(255), \`tin\` varchar(32),
    \`payout_method\` varchar(32), \`payout_number\` varchar(32),
    \`commission_terms_accepted\` boolean NOT NULL DEFAULT false,
    \`seller_contract_accepted\` boolean NOT NULL DEFAULT false,
    \`commission_terms_accepted_at\` timestamp NULL,
    \`seller_contract_accepted_at\` timestamp NULL,
    \`verified\` boolean NOT NULL DEFAULT false, \`rating\` int NOT NULL DEFAULT 45,
    \`status\` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
    \`created_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS products (
    \`id\` bigint unsigned NOT NULL AUTO_INCREMENT PRIMARY KEY,
    \`seller_id\` bigint unsigned NOT NULL, \`name\` varchar(255) NOT NULL, \`slug\` varchar(255) NOT NULL,
    \`category\` varchar(64) NOT NULL, \`price\` int NOT NULL, \`old_price\` int, \`image\` varchar(255) NOT NULL,
    \`stock\` int NOT NULL DEFAULT 0, \`condition\` enum('new','refurbished','used') NOT NULL DEFAULT 'new',
    \`warranty_months\` int NOT NULL DEFAULT 0, \`flash_sale\` boolean NOT NULL DEFAULT false,
    \`created_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS listings (
    \`id\` bigint unsigned NOT NULL AUTO_INCREMENT PRIMARY KEY,
    \`seller_id\` bigint unsigned NOT NULL, \`name\` varchar(255) NOT NULL, \`category\` varchar(64) NOT NULL,
    \`price\` int NOT NULL, \`old_price\` int, \`stock\` int NOT NULL DEFAULT 1,
    \`condition\` enum('new','refurbished','used') NOT NULL DEFAULT 'new',
    \`warranty_months\` int NOT NULL DEFAULT 0, \`image_note\` varchar(255) NOT NULL,
    \`image_data\` mediumtext,
    \`status\` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
    \`created_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS restaurants (
    \`id\` bigint unsigned NOT NULL AUTO_INCREMENT PRIMARY KEY,
    \`name\` varchar(255) NOT NULL, \`slug\` varchar(255) NOT NULL, \`cuisine\` varchar(128) NOT NULL,
    \`area\` varchar(128) NOT NULL, \`delivery_mins\` int NOT NULL DEFAULT 35, \`delivery_fee\` int NOT NULL DEFAULT 3000,
    \`min_order\` int NOT NULL DEFAULT 10000, \`rating\` int NOT NULL DEFAULT 45, \`image\` varchar(255) NOT NULL,
    \`open\` boolean NOT NULL DEFAULT true, \`featured\` boolean NOT NULL DEFAULT false,
    \`created_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS menu_items (
    \`id\` bigint unsigned NOT NULL AUTO_INCREMENT PRIMARY KEY,
    \`restaurant_id\` bigint unsigned NOT NULL, \`name\` varchar(255) NOT NULL, \`description\` text,
    \`price\` int NOT NULL, \`image\` varchar(255), \`popular\` boolean NOT NULL DEFAULT false,
    \`created_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS orders (
    \`id\` bigint unsigned NOT NULL AUTO_INCREMENT PRIMARY KEY,
    \`code\` varchar(16) NOT NULL, \`customer_name\` varchar(255) NOT NULL, \`phone\` varchar(32) NOT NULL,
    \`address\` text NOT NULL, \`payment_method\` enum('mtn_momo','airtel_money','cash') NOT NULL,
    \`subtotal\` int NOT NULL, \`delivery_fee\` int NOT NULL DEFAULT 0, \`total\` int NOT NULL,
    \`status\` enum('placed','confirmed','pending_delivery','on_the_way','delivered','cancelled') NOT NULL DEFAULT 'placed',
    \`payment_status\` enum('unpaid','pending_confirmation','paid') NOT NULL DEFAULT 'unpaid',
    \`payment_ref\` varchar(64) NULL,
    \`commission_fee\` int NOT NULL DEFAULT 0,
    \`paid_out\` boolean NOT NULL DEFAULT false,
    \`payout_ref\` varchar(64) NULL,
    \`created_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS order_items (
    \`id\` bigint unsigned NOT NULL AUTO_INCREMENT PRIMARY KEY,
    \`order_id\` bigint unsigned NOT NULL, \`item_type\` enum('product','menu_item') NOT NULL,
    \`item_id\` bigint unsigned NOT NULL, \`name\` varchar(255) NOT NULL, \`price\` int NOT NULL, \`qty\` int NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS customers (
    \`id\` bigint unsigned NOT NULL AUTO_INCREMENT PRIMARY KEY,
    \`name\` varchar(255) NOT NULL, \`phone\` varchar(32) NOT NULL,
    \`location\` text,
    \`created_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS plus_memberships (
    \`id\` bigint unsigned NOT NULL AUTO_INCREMENT PRIMARY KEY,
    \`customer_id\` bigint unsigned NOT NULL UNIQUE,
    \`plan\` varchar(32) NOT NULL DEFAULT 'monthly',
    \`status\` enum('pending','active','expired','cancelled','payment_failed') NOT NULL DEFAULT 'pending',
    \`starts_at\` timestamp NULL, \`expires_at\` timestamp NULL,
    \`provider\` varchar(32) NULL, \`provider_reference\` varchar(128) NULL,
    \`created_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    \`updated_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS plus_payments (
    \`id\` bigint unsigned NOT NULL AUTO_INCREMENT PRIMARY KEY,
    \`customer_id\` bigint unsigned NOT NULL, \`membership_id\` bigint unsigned NULL,
    \`reference\` varchar(128) NOT NULL UNIQUE, \`transaction_id\` varchar(128) NULL,
    \`amount\` int NOT NULL, \`currency\` varchar(8) NOT NULL DEFAULT 'UGX',
    \`status\` enum('pending','successful','failed','cancelled') NOT NULL DEFAULT 'pending',
    \`provider_response\` json NULL, \`created_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    \`verified_at\` timestamp NULL, INDEX \`idx_plus_payments_customer\` (\`customer_id\`)
  )`,
  `CREATE TABLE IF NOT EXISTS affiliates (
    \`id\` bigint unsigned NOT NULL AUTO_INCREMENT PRIMARY KEY,
    \`name\` varchar(255) NOT NULL, \`phone\` varchar(32) NOT NULL, \`channel\` varchar(64) NOT NULL,
    \`code\` varchar(16) NOT NULL, \`created_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS delivery_partners (
    \`id\` bigint unsigned NOT NULL AUTO_INCREMENT PRIMARY KEY,
    \`full_name\` varchar(255) NOT NULL, \`phone\` varchar(32) NOT NULL,
    \`area\` varchar(128) NOT NULL, \`vehicle_type\` varchar(64) NOT NULL,
    \`payout_method\` varchar(32) NOT NULL, \`payout_number\` varchar(32) NOT NULL,
    \`contract_accepted\` boolean NOT NULL DEFAULT false,
    \`delivery_share_accepted\` boolean NOT NULL DEFAULT false,
    \`contract_accepted_at\` timestamp NULL,
    \`status\` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
    \`created_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS seller_ad_bookings (
    \`id\` bigint unsigned NOT NULL AUTO_INCREMENT PRIMARY KEY,
    \`seller_id\` bigint unsigned NOT NULL,
    \`plan_type\` enum('weekly','monthly') NOT NULL,
    \`amount\` int NOT NULL,
    \`status\` enum('booked','paid','active','completed','cancelled') NOT NULL DEFAULT 'booked',
    \`notes\` varchar(255) NULL,
    \`created_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS admin_audit_logs (
    \`id\` bigint unsigned NOT NULL AUTO_INCREMENT PRIMARY KEY,
    \`actor_tag\` varchar(32) NOT NULL,
    \`action\` varchar(64) NOT NULL,
    \`entity_type\` varchar(64) NOT NULL,
    \`entity_id\` varchar(64) NOT NULL,
    \`before_state\` text NULL,
    \`after_state\` text NULL,
    \`meta\` text NULL,
    \`created_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
];

// Column upgrades for existing tables (ignored when the column already exists)
const ALTERS = [
  "ALTER TABLE orders ADD COLUMN \`payment_status\` enum('unpaid','pending_confirmation','paid') NOT NULL DEFAULT 'unpaid'",
  "ALTER TABLE orders ADD COLUMN \`payment_ref\` varchar(64) NULL",
  "ALTER TABLE orders ADD COLUMN \`commission_fee\` int NOT NULL DEFAULT 0",
  "ALTER TABLE orders ADD COLUMN \`paid_out\` boolean NOT NULL DEFAULT false",
  "ALTER TABLE orders ADD COLUMN \`payout_ref\` varchar(64) NULL",
  "ALTER TABLE orders MODIFY COLUMN \`status\` enum('placed','confirmed','pending_delivery','on_the_way','delivered','cancelled') NOT NULL DEFAULT 'placed'",
  "ALTER TABLE sellers ADD COLUMN \`commission_terms_accepted\` boolean NOT NULL DEFAULT false",
  "ALTER TABLE sellers ADD COLUMN \`seller_contract_accepted\` boolean NOT NULL DEFAULT false",
  "ALTER TABLE sellers ADD COLUMN \`commission_terms_accepted_at\` timestamp NULL",
  "ALTER TABLE sellers ADD COLUMN \`seller_contract_accepted_at\` timestamp NULL",
  "UPDATE orders SET commission_fee = ROUND(subtotal * 0.07) WHERE commission_fee = 0 AND subtotal > 0",
];

export const bootstrapRouter = createRouter({
  setup: publicQuery
    .input(z.object({ key: z.string() }))
    .mutation(async ({ input }) => {
      if (input.key !== BOOTSTRAP_KEY) throw new Error("Invalid setup key");
      const db = getDb();
      // DDL must use the text protocol (mysql2 .query), not prepared statements (.execute)
      const raw: any = (db as any).$client;
      const client: any = typeof raw.promise === "function" ? raw.promise() : raw;
      for (const stmt of TABLES) {
        await client.query(stmt);
      }
      for (const stmt of ALTERS) {
        try { await client.query(stmt); } catch (e: any) { if (e?.errno !== 1060) throw e; } // 1060 = duplicate column
      }
      // Normalize legacy phone numbers (strip spaces/dashes) so account lookups always match
      await client.query("UPDATE orders SET phone = REPLACE(REPLACE(phone, ' ', ''), '-', '')");
      await client.query("UPDATE customers SET phone = REPLACE(REPLACE(phone, ' ', ''), '-', '')");
      const [countRows]: any = await db.execute(sql.raw("SELECT COUNT(*) AS n FROM products"));
      const rows = Array.isArray(countRows) ? countRows : [countRows];
      const n = Number(rows[0]?.n ?? 0);
      let seeded = false;
      if (n === 0) {
        await runSeed();
        seeded = true;
      }
      const groceryCatalog = await syncDemoGroceries(db);
      const [after]: any = await db.execute(sql.raw(
        "SELECT (SELECT COUNT(*) FROM products) AS products, (SELECT COUNT(*) FROM sellers) AS sellers, (SELECT COUNT(*) FROM restaurants) AS restaurants, (SELECT COUNT(*) FROM menu_items) AS menu_items"
      ));
      const summary = Array.isArray(after) ? after[0] : after;
      return { ok: true, seeded, groceryCatalog, ...summary };
    }),

  // Kept as a compatibility endpoint for existing deployment notes. It now
  // retires the Kikuubo import and syncs the original UG Souq demo catalog.
  seedSuppliers: publicQuery
    .input(z.object({ key: z.string() }))
    .mutation(async ({ input }) => {
      if (input.key !== BOOTSTRAP_KEY) throw new Error("Invalid setup key");
      const db = getDb();
      return { ok: true, ...(await syncDemoGroceries(db)) };
    }),
});

