-- Private seller identity evidence. Raw identity data never belongs in the
-- public seller profile and can only be decrypted by the application server.
CREATE TABLE IF NOT EXISTS seller_identity_documents (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  seller_id BIGINT UNSIGNED NOT NULL UNIQUE,
  document_type ENUM('national_id','passport','driving_permit') NOT NULL,
  id_number_ciphertext TEXT NULL,
  id_number_iv VARCHAR(32) NULL,
  id_number_tag VARCHAR(32) NULL,
  id_number_fingerprint VARCHAR(64) NOT NULL UNIQUE,
  id_number_last4 VARCHAR(4) NOT NULL,
  document_ciphertext MEDIUMTEXT NULL,
  document_iv VARCHAR(32) NULL,
  document_tag VARCHAR(32) NULL,
  mime_type VARCHAR(64) NULL,
  original_name VARCHAR(255) NULL,
  status ENUM('pending','approved','rejected','deleted') NOT NULL DEFAULT 'pending',
  purpose VARCHAR(255) NOT NULL DEFAULT 'Seller identity verification and marketplace fraud prevention',
  consent_version VARCHAR(32) NOT NULL,
  consented_at TIMESTAMP NOT NULL,
  reviewed_at TIMESTAMP NULL,
  reviewed_by VARCHAR(64) NULL,
  review_notes TEXT NULL,
  retention_until TIMESTAMP NULL,
  deleted_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_identity_status (status),
  INDEX idx_identity_retention (retention_until)
);

ALTER TABLE listings ADD COLUMN is_branded BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE listings ADD COLUMN brand_name VARCHAR(128) NULL;
ALTER TABLE listings ADD COLUMN authenticity_evidence TEXT NULL;

CREATE TABLE IF NOT EXISTS payment_transactions (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_id BIGINT UNSIGNED NOT NULL,
  provider ENUM('pesapal') NOT NULL DEFAULT 'pesapal',
  merchant_reference VARCHAR(50) NOT NULL UNIQUE,
  tracking_id VARCHAR(64) NULL UNIQUE,
  amount INT NOT NULL,
  currency VARCHAR(8) NOT NULL DEFAULT 'UGX',
  status ENUM('pending','completed','failed','reversed','invalid') NOT NULL DEFAULT 'pending',
  payment_method VARCHAR(64) NULL,
  payment_account_masked VARCHAR(128) NULL,
  confirmation_code VARCHAR(128) NULL,
  provider_response JSON NULL,
  verified_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_payment_order (order_id),
  INDEX idx_payment_status (status)
);
