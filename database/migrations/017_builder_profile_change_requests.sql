-- Migration 017: Builder profile change review workflow
SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS builder_profile_change_requests (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  uuid CHAR(36) NOT NULL,
  builder_profile_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  snapshot_before JSON NULL,
  proposed_changes JSON NOT NULL,
  status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  reviewed_by BIGINT UNSIGNED NULL,
  reviewer_notes VARCHAR(500) NULL,
  reviewed_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_builder_profile_change_requests_uuid (uuid),
  KEY idx_bpcr_status (status, created_at),
  KEY idx_bpcr_builder (builder_profile_id),
  CONSTRAINT fk_bpcr_builder FOREIGN KEY (builder_profile_id) REFERENCES builder_profiles (id),
  CONSTRAINT fk_bpcr_user FOREIGN KEY (user_id) REFERENCES users (id),
  CONSTRAINT fk_bpcr_reviewer FOREIGN KEY (reviewed_by) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
