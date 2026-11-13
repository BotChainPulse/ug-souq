import { bigint, mysqlTable, timestamp, varchar, text } from "drizzle-orm/mysql-core";

export const customerAddressBooks = mysqlTable("customer_address_books", {
  customerId: bigint("customer_id", { mode: "number", unsigned: true }).primaryKey(),
  addresses: text("addresses").notNull(),
});

export const customerAddressLinks = mysqlTable("customer_address_links", {
  customerId: bigint("customer_id", { mode: "number", unsigned: true }).primaryKey(),
  pairingHash: varchar("pairing_hash", { length: 64 }).unique(),
  pairingExpiresAt: timestamp("pairing_expires_at", { mode: "date" }),
  deviceHash: varchar("device_hash", { length: 64 }).unique(),
  deviceExpiresAt: timestamp("device_expires_at", { mode: "date" }),
});

export const ADDRESS_BOOK_TABLE_SQL = [
  `CREATE TABLE IF NOT EXISTS customer_address_books (
    customer_id BIGINT UNSIGNED NOT NULL PRIMARY KEY,
    addresses TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS customer_address_links (
    customer_id BIGINT UNSIGNED NOT NULL PRIMARY KEY,
    pairing_hash VARCHAR(64) NULL UNIQUE,
    pairing_expires_at TIMESTAMP NULL,
    device_hash VARCHAR(64) NULL UNIQUE,
    device_expires_at TIMESTAMP NULL
  )`,
];
