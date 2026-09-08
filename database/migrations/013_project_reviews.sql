CREATE TABLE IF NOT EXISTS project_review_sessions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  uuid CHAR(36) NOT NULL,
  project_id BIGINT UNSIGNED NOT NULL,
  submission_number INT UNSIGNED NOT NULL DEFAULT 1,
  status ENUM('in_review', 'completed') NOT NULL DEFAULT 'in_review',
  decision ENUM('published', 'rejected') NULL,
  reviewer_id BIGINT UNSIGNED NULL,
  reviewer_notes TEXT NULL,
  completed_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_project_review_sessions_uuid (uuid),
  KEY idx_project_review_sessions_project (project_id, status),
  CONSTRAINT fk_project_review_sessions_project FOREIGN KEY (project_id) REFERENCES projects (id),
  CONSTRAINT fk_project_review_sessions_reviewer FOREIGN KEY (reviewer_id) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS project_review_items (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  uuid CHAR(36) NOT NULL,
  session_id BIGINT UNSIGNED NOT NULL,
  section_key VARCHAR(50) NOT NULL,
  entity_uuid CHAR(36) NULL,
  title VARCHAR(200) NOT NULL,
  status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
  rating TINYINT UNSIGNED NULL,
  rejection_reason VARCHAR(500) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_project_review_items_uuid (uuid),
  KEY idx_project_review_items_session (session_id),
  CONSTRAINT fk_project_review_items_session FOREIGN KEY (session_id) REFERENCES project_review_sessions (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
