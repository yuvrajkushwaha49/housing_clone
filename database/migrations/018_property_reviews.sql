CREATE TABLE IF NOT EXISTS property_review_sessions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  uuid CHAR(36) NOT NULL,
  property_id BIGINT UNSIGNED NOT NULL,
  submission_number INT UNSIGNED NOT NULL DEFAULT 1,
  status ENUM('in_review', 'completed') NOT NULL DEFAULT 'in_review',
  decision ENUM('approved', 'rejected') NULL,
  reviewer_id BIGINT UNSIGNED NULL,
  reviewer_notes TEXT NULL,
  completed_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_property_review_sessions_uuid (uuid),
  KEY idx_property_review_sessions_property (property_id, status),
  CONSTRAINT fk_property_review_sessions_property FOREIGN KEY (property_id) REFERENCES properties (id),
  CONSTRAINT fk_property_review_sessions_reviewer FOREIGN KEY (reviewer_id) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS property_review_items (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  uuid CHAR(36) NOT NULL,
  session_id BIGINT UNSIGNED NOT NULL,
  section_key VARCHAR(50) NOT NULL,
  field_key VARCHAR(80) NOT NULL,
  entity_uuid CHAR(36) NULL,
  title VARCHAR(200) NOT NULL,
  status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
  rating TINYINT UNSIGNED NULL,
  rejection_reason VARCHAR(500) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_property_review_items_uuid (uuid),
  KEY idx_property_review_items_session (session_id),
  CONSTRAINT fk_property_review_items_session FOREIGN KEY (session_id) REFERENCES property_review_sessions (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET @db = DATABASE();

SET @submission_col := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'properties' AND COLUMN_NAME = 'submission_count'
);
SET @sql := IF(
  @submission_col = 0,
  'ALTER TABLE properties ADD COLUMN submission_count INT UNSIGNED NOT NULL DEFAULT 0 AFTER rejection_reason',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
