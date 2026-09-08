-- Migration 009: Project buildings (group towers under buildings)
SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS project_buildings (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  uuid CHAR(36) NOT NULL,
  project_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(120) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_project_buildings_uuid (uuid),
  KEY idx_project_buildings_project (project_id),
  CONSTRAINT fk_project_buildings_project FOREIGN KEY (project_id) REFERENCES projects (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE project_towers
  ADD COLUMN building_id BIGINT UNSIGNED NULL AFTER project_id,
  ADD KEY idx_project_towers_building (building_id),
  ADD CONSTRAINT fk_project_towers_building FOREIGN KEY (building_id) REFERENCES project_buildings (id);
