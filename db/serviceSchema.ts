import { mysqlTable, serial, bigint, varchar, text, int, mysqlEnum, timestamp } from 'drizzle-orm/mysql-core'
export const serviceProviders = mysqlTable('service_providers', {
  id: serial('id').primaryKey(), customerId: bigint('customer_id', { mode: 'number', unsigned: true }).notNull().unique(),
  businessName: varchar('business_name', { length: 128 }).notNull(), category: varchar('category', { length: 64 }).notNull(),
  district: varchar('district', { length: 64 }).notNull(), description: text('description').notNull(),
  experience: text('experience').notNull(), startingPrice: int('starting_price'), priceUnit: varchar('price_unit', { length: 16 }).notNull(),
  status: mysqlEnum('status', ['pending','approved','rejected','suspended']).notNull().default('pending'),
  proposalVersion: varchar('proposal_version', { length: 64 }).notNull(), consentedAt: timestamp('consented_at').notNull(),
  reviewNotes: text('review_notes'), reviewedAt: timestamp('reviewed_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})
export const serviceRequests = mysqlTable('service_requests', {
  id: serial('id').primaryKey(), providerId: bigint('provider_id', { mode: 'number', unsigned: true }).notNull(),
  customerId: bigint('customer_id', { mode: 'number', unsigned: true }).notNull(), brief: text('brief').notNull(),
  district: varchar('district', { length: 64 }).notNull(), preferredDate: varchar('preferred_date', { length: 10 }),
  status: mysqlEnum('status', ['requested','contacted','closed','cancelled']).notNull().default('requested'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})
export const SERVICE_TABLE_SQL = [
  `CREATE TABLE IF NOT EXISTS service_providers (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, customer_id BIGINT UNSIGNED NOT NULL UNIQUE,
    business_name VARCHAR(128) NOT NULL, category VARCHAR(64) NOT NULL, district VARCHAR(64) NOT NULL,
    description TEXT NOT NULL, experience TEXT NOT NULL, starting_price INT NULL, price_unit VARCHAR(16) NOT NULL,
    status ENUM('pending','approved','rejected','suspended') NOT NULL DEFAULT 'pending',
    proposal_version VARCHAR(64) NOT NULL, consented_at TIMESTAMP NOT NULL,
    review_notes TEXT NULL, reviewed_at TIMESTAMP NULL, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
  `CREATE TABLE IF NOT EXISTS service_requests (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, provider_id BIGINT UNSIGNED NOT NULL,
    customer_id BIGINT UNSIGNED NOT NULL, brief TEXT NOT NULL, district VARCHAR(64) NOT NULL,
    preferred_date VARCHAR(10) NULL, status ENUM('requested','contacted','closed','cancelled') NOT NULL DEFAULT 'requested',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_service_provider (provider_id), INDEX idx_service_customer (customer_id))`,
]
