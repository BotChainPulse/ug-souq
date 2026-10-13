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
  `CREATE TABLE IF NOT EXISTS service_notifications (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, event_key VARCHAR(128) NOT NULL UNIQUE, customer_id BIGINT UNSIGNED NOT NULL,
    provider_id BIGINT UNSIGNED NOT NULL, request_id BIGINT UNSIGNED NULL,
    kind ENUM('review','enquiry') NOT NULL, decision VARCHAR(16) NULL,
    email_state ENUM('pending','sending','accepted','failed','skipped') NOT NULL DEFAULT 'pending',
    attempts INT NOT NULL DEFAULT 0, attempted_at TIMESTAMP NULL, first_attempt_at TIMESTAMP NULL,
    next_attempt_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    email_id VARCHAR(128) NULL, failure_code VARCHAR(32) NULL,
    recipient_email VARCHAR(255) NULL, sender_address VARCHAR(255) NULL,
    email_subject VARCHAR(255) NULL, email_html TEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_service_notification_queue (email_state,next_attempt_at))`,
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

export const serviceNotifications = mysqlTable('service_notifications', {
  eventKey: varchar('event_key', { length: 128 }).notNull().unique(),
  id: serial('id').primaryKey(), customerId: bigint('customer_id', { mode: 'number', unsigned: true }).notNull(),
  providerId: bigint('provider_id', { mode: 'number', unsigned: true }).notNull(), requestId: bigint('request_id', { mode: 'number', unsigned: true }),
  kind: mysqlEnum('kind', ['review','enquiry']).notNull(), decision: varchar('decision', { length: 16 }),
  emailState: mysqlEnum('email_state', ['pending','sending','accepted','failed','skipped']).notNull().default('pending'),
  attempts: int('attempts').notNull().default(0), attemptedAt: timestamp('attempted_at'), firstAttemptAt: timestamp('first_attempt_at'),
  nextAttemptAt: timestamp('next_attempt_at').notNull().defaultNow(), emailId: varchar('email_id', { length: 128 }),
  failureCode: varchar('failure_code', { length: 32 }), createdAt: timestamp('created_at').notNull().defaultNow(),
  recipientEmail: varchar('recipient_email', { length: 255 }), senderAddress: varchar('sender_address', { length: 255 }),
  emailSubject: varchar('email_subject', { length: 255 }), emailHtml: text('email_html'),
})
