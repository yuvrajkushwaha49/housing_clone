-- Migration 006: Builder profiles, projects, towers, units, inventory, team, bookings
SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS builder_profiles (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  uuid CHAR(36) NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  company_name VARCHAR(200) NOT NULL,
  legal_name VARCHAR(200) NULL,
  gstin VARCHAR(30) NULL,
  rera_number VARCHAR(80) NULL,
  logo_url VARCHAR(500) NULL,
  website VARCHAR(255) NULL,
  about TEXT NULL,
  year_established SMALLINT UNSIGNED NULL,
  address VARCHAR(500) NULL,
  city_id BIGINT UNSIGNED NULL,
  verification_status ENUM('unverified','pending','verified','rejected') NOT NULL DEFAULT 'unverified',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by BIGINT UNSIGNED NULL,
  updated_by BIGINT UNSIGNED NULL,
  deleted_at DATETIME NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_builder_profiles_uuid (uuid),
  UNIQUE KEY uk_builder_profiles_user (user_id),
  KEY idx_builder_profiles_city (city_id),
  CONSTRAINT fk_builder_profiles_user FOREIGN KEY (user_id) REFERENCES users (id),
  CONSTRAINT fk_builder_profiles_city FOREIGN KEY (city_id) REFERENCES cities (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS projects (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  uuid CHAR(36) NOT NULL,
  slug VARCHAR(255) NOT NULL,
  builder_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  category_id BIGINT UNSIGNED NULL,
  country_id BIGINT UNSIGNED NULL,
  state_id BIGINT UNSIGNED NULL,
  city_id BIGINT UNSIGNED NULL,
  locality_id BIGINT UNSIGNED NULL,
  address_line VARCHAR(500) NULL,
  latitude DECIMAL(10,7) NULL,
  longitude DECIMAL(10,7) NULL,
  rera_id VARCHAR(80) NULL,
  launch_date DATE NULL,
  possession_date DATE NULL,
  min_price DECIMAL(15,2) NULL,
  max_price DECIMAL(15,2) NULL,
  status ENUM('draft','pending','published','rejected','archived') NOT NULL DEFAULT 'draft',
  verification_status ENUM('unverified','pending','verified','rejected') NOT NULL DEFAULT 'unverified',
  brochure_path VARCHAR(500) NULL,
  rejection_reason TEXT NULL,
  meta_title VARCHAR(255) NULL,
  meta_description VARCHAR(500) NULL,
  meta_keywords VARCHAR(255) NULL,
  views_count INT UNSIGNED NOT NULL DEFAULT 0,
  published_at DATETIME NULL,
  approved_at DATETIME NULL,
  approved_by BIGINT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by BIGINT UNSIGNED NULL,
  updated_by BIGINT UNSIGNED NULL,
  deleted_at DATETIME NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_projects_uuid (uuid),
  UNIQUE KEY uk_projects_slug (slug),
  KEY idx_projects_builder (builder_id),
  KEY idx_projects_status_city (status, city_id),
  FULLTEXT KEY ft_projects_search (name, description),
  CONSTRAINT fk_projects_builder FOREIGN KEY (builder_id) REFERENCES builder_profiles (id),
  CONSTRAINT fk_projects_category FOREIGN KEY (category_id) REFERENCES property_categories (id),
  CONSTRAINT fk_projects_country FOREIGN KEY (country_id) REFERENCES countries (id),
  CONSTRAINT fk_projects_state FOREIGN KEY (state_id) REFERENCES states (id),
  CONSTRAINT fk_projects_city FOREIGN KEY (city_id) REFERENCES cities (id),
  CONSTRAINT fk_projects_locality FOREIGN KEY (locality_id) REFERENCES localities (id),
  CONSTRAINT fk_projects_approved_by FOREIGN KEY (approved_by) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS project_towers (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  uuid CHAR(36) NOT NULL,
  project_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(120) NOT NULL,
  total_floors INT UNSIGNED NULL,
  total_units INT UNSIGNED NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_project_towers_uuid (uuid),
  KEY idx_project_towers_project (project_id),
  CONSTRAINT fk_project_towers_project FOREIGN KEY (project_id) REFERENCES projects (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS project_units (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  uuid CHAR(36) NOT NULL,
  project_id BIGINT UNSIGNED NOT NULL,
  tower_id BIGINT UNSIGNED NULL,
  unit_number VARCHAR(60) NOT NULL,
  unit_type VARCHAR(80) NULL,
  bedrooms TINYINT UNSIGNED NULL,
  bathrooms TINYINT UNSIGNED NULL,
  area DECIMAL(12,2) NULL,
  area_unit_id BIGINT UNSIGNED NULL,
  price DECIMAL(15,2) NULL,
  floor_number INT NULL,
  status ENUM('available','held','sold','blocked') NOT NULL DEFAULT 'available',
  property_id BIGINT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_project_units_uuid (uuid),
  UNIQUE KEY uk_project_units_number (project_id, unit_number),
  KEY idx_project_units_tower (tower_id),
  KEY idx_project_units_status (project_id, status),
  CONSTRAINT fk_project_units_project FOREIGN KEY (project_id) REFERENCES projects (id),
  CONSTRAINT fk_project_units_tower FOREIGN KEY (tower_id) REFERENCES project_towers (id),
  CONSTRAINT fk_project_units_area_unit FOREIGN KEY (area_unit_id) REFERENCES area_units (id),
  CONSTRAINT fk_project_units_property FOREIGN KEY (property_id) REFERENCES properties (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS project_media (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  uuid CHAR(36) NOT NULL,
  project_id BIGINT UNSIGNED NOT NULL,
  media_type ENUM('image','video','document','floor_plan','brochure') NOT NULL DEFAULT 'image',
  file_path VARCHAR(500) NOT NULL,
  file_name VARCHAR(255) NULL,
  mime_type VARCHAR(120) NULL,
  file_size INT UNSIGNED NULL,
  caption VARCHAR(255) NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_primary TINYINT(1) NOT NULL DEFAULT 0,
  created_by BIGINT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_project_media_uuid (uuid),
  KEY idx_project_media_project (project_id, media_type),
  CONSTRAINT fk_project_media_project FOREIGN KEY (project_id) REFERENCES projects (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS project_amenities (
  project_id BIGINT UNSIGNED NOT NULL,
  amenity_id BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (project_id, amenity_id),
  CONSTRAINT fk_project_amenities_project FOREIGN KEY (project_id) REFERENCES projects (id),
  CONSTRAINT fk_project_amenities_amenity FOREIGN KEY (amenity_id) REFERENCES amenities (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS inventory_holds (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  uuid CHAR(36) NOT NULL,
  unit_id BIGINT UNSIGNED NOT NULL,
  held_by_user_id BIGINT UNSIGNED NOT NULL,
  expires_at DATETIME NOT NULL,
  status ENUM('active','released','expired','converted') NOT NULL DEFAULT 'active',
  notes VARCHAR(500) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_inventory_holds_uuid (uuid),
  KEY idx_inventory_holds_unit (unit_id, status),
  CONSTRAINT fk_inventory_holds_unit FOREIGN KEY (unit_id) REFERENCES project_units (id),
  CONSTRAINT fk_inventory_holds_user FOREIGN KEY (held_by_user_id) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS builder_team_members (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  uuid CHAR(36) NOT NULL,
  builder_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NULL,
  name VARCHAR(150) NOT NULL,
  email VARCHAR(255) NULL,
  phone VARCHAR(20) NULL,
  role_title VARCHAR(120) NULL,
  permissions_json JSON NULL,
  status ENUM('active','invited','inactive') NOT NULL DEFAULT 'active',
  invited_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_builder_team_uuid (uuid),
  KEY idx_builder_team_builder (builder_id),
  CONSTRAINT fk_builder_team_builder FOREIGN KEY (builder_id) REFERENCES builder_profiles (id),
  CONSTRAINT fk_builder_team_user FOREIGN KEY (user_id) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS booking_requests (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  uuid CHAR(36) NOT NULL,
  project_id BIGINT UNSIGNED NOT NULL,
  unit_id BIGINT UNSIGNED NULL,
  buyer_user_id BIGINT UNSIGNED NOT NULL,
  amount DECIMAL(15,2) NULL,
  status ENUM('requested','confirmed','cancelled','completed') NOT NULL DEFAULT 'requested',
  notes TEXT NULL,
  handler_notes VARCHAR(500) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_booking_requests_uuid (uuid),
  KEY idx_booking_requests_project (project_id, status),
  KEY idx_booking_requests_buyer (buyer_user_id),
  CONSTRAINT fk_booking_requests_project FOREIGN KEY (project_id) REFERENCES projects (id),
  CONSTRAINT fk_booking_requests_unit FOREIGN KEY (unit_id) REFERENCES project_units (id),
  CONSTRAINT fk_booking_requests_buyer FOREIGN KEY (buyer_user_id) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Optional links from listings to projects/units
SET @db := DATABASE();
SET @sql := (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE properties ADD COLUMN builder_id BIGINT UNSIGNED NULL AFTER listed_by_user_id, ADD COLUMN project_id BIGINT UNSIGNED NULL AFTER builder_id, ADD COLUMN unit_id BIGINT UNSIGNED NULL AFTER project_id',
    'SELECT 1'
  )
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'properties' AND COLUMN_NAME = 'builder_id'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add FKs if missing (ignore failures via procedure-less checks)
SET @sql := (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE properties ADD CONSTRAINT fk_properties_builder FOREIGN KEY (builder_id) REFERENCES builder_profiles (id)',
    'SELECT 1'
  )
  FROM information_schema.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'properties' AND CONSTRAINT_NAME = 'fk_properties_builder'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql := (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE properties ADD CONSTRAINT fk_properties_project FOREIGN KEY (project_id) REFERENCES projects (id)',
    'SELECT 1'
  )
  FROM information_schema.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'properties' AND CONSTRAINT_NAME = 'fk_properties_project'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql := (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE properties ADD CONSTRAINT fk_properties_unit FOREIGN KEY (unit_id) REFERENCES project_units (id)',
    'SELECT 1'
  )
  FROM information_schema.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'properties' AND CONSTRAINT_NAME = 'fk_properties_unit'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
