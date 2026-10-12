import { mysqlTable, serial, bigint, varchar, text, mediumtext, mysqlEnum, timestamp } from 'drizzle-orm/mysql-core'
export const healthcareProfessionals = mysqlTable('healthcare_professionals', {
  id: serial('id').primaryKey(), customerId: bigint('customer_id', { mode: 'number', unsigned: true }).notNull().unique(),
  name: varchar('name', { length: 128 }).notNull(), profession: mysqlEnum('profession', ['doctor','pharmacist']).notNull(),
  district: varchar('district', { length: 64 }).notNull(), facility: varchar('facility', { length: 128 }).notNull(),
  specialty: varchar('specialty', { length: 128 }).notNull(), businessPhone: varchar('business_phone', { length: 32 }).notNull(),
  registrationNumber: varchar('registration_number', { length: 64 }).notNull(), licenceExpiresOn: varchar('licence_expires_on', { length: 10 }).notNull(),
  facilityLicenceReference: varchar('facility_licence_reference', { length: 128 }).notNull(), facilityLicenceExpiresOn: varchar('facility_licence_expires_on', { length: 10 }).notNull(),
  status: mysqlEnum('status', ['pending','approved','rejected','suspended']).notNull().default('pending'),
  consentVersion: varchar('consent_version', { length: 64 }).notNull(), consentedAt: timestamp('consented_at').notNull(),
  verifiedAt: timestamp('verified_at'), reviewNotes: text('review_notes'), createdAt: timestamp('created_at').notNull().defaultNow(),
})
export const prescriptionPhotos = mysqlTable('prescription_photos', {
  id: serial('id').primaryKey(), customerId: bigint('customer_id', { mode: 'number', unsigned: true }).notNull(),
  professionalId: bigint('professional_id', { mode: 'number', unsigned: true }).notNull(),
  ciphertext: mediumtext('ciphertext').notNull(), iv: varchar('iv', { length: 24 }).notNull(), tag: varchar('tag', { length: 32 }).notNull(),
  consentVersion: varchar('consent_version', { length: 64 }).notNull(), expiresAt: timestamp('expires_at').notNull(),
  status: mysqlEnum('status', ['received','reviewed']).notNull().default('received'), createdAt: timestamp('created_at').notNull().defaultNow(),
})
export const HEALTHCARE_TABLE_SQL = [
  `CREATE TABLE IF NOT EXISTS healthcare_professionals (id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, customer_id BIGINT UNSIGNED NOT NULL UNIQUE,
   name VARCHAR(128) NOT NULL, profession ENUM('doctor','pharmacist') NOT NULL, district VARCHAR(64) NOT NULL, facility VARCHAR(128) NOT NULL,
   specialty VARCHAR(128) NOT NULL, business_phone VARCHAR(32) NOT NULL, registration_number VARCHAR(64) NOT NULL, licence_expires_on VARCHAR(10) NOT NULL,
   facility_licence_reference VARCHAR(128) NOT NULL, facility_licence_expires_on VARCHAR(10) NOT NULL, status ENUM('pending','approved','rejected','suspended') NOT NULL DEFAULT 'pending',
   consent_version VARCHAR(64) NOT NULL, consented_at TIMESTAMP NOT NULL, verified_at TIMESTAMP NULL, review_notes TEXT NULL, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
  `CREATE TABLE IF NOT EXISTS prescription_photos (id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, customer_id BIGINT UNSIGNED NOT NULL, professional_id BIGINT UNSIGNED NOT NULL,
   ciphertext MEDIUMTEXT NOT NULL, iv VARCHAR(24) NOT NULL, tag VARCHAR(32) NOT NULL, consent_version VARCHAR(64) NOT NULL, expires_at TIMESTAMP NOT NULL,
   status ENUM('received','reviewed') NOT NULL DEFAULT 'received', created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
   INDEX idx_prescription_customer (customer_id), INDEX idx_prescription_professional (professional_id), INDEX idx_prescription_expiry (expires_at))`,
]
