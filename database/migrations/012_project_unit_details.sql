-- Extra unit details: balconies, parking, carpet area, furnishing, facing
SET @db = DATABASE();

SET @balconies_col := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'project_units' AND COLUMN_NAME = 'balconies'
);
SET @sql := IF(
  @balconies_col = 0,
  'ALTER TABLE project_units ADD COLUMN balconies TINYINT UNSIGNED NULL AFTER bathrooms',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @parking_col := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'project_units' AND COLUMN_NAME = 'parking'
);
SET @sql := IF(
  @parking_col = 0,
  'ALTER TABLE project_units ADD COLUMN parking TINYINT UNSIGNED NULL AFTER balconies',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @carpet_col := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'project_units' AND COLUMN_NAME = 'carpet_area'
);
SET @sql := IF(
  @carpet_col = 0,
  'ALTER TABLE project_units ADD COLUMN carpet_area DECIMAL(12,2) NULL AFTER area',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @furnishing_col := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'project_units' AND COLUMN_NAME = 'furnishing_id'
);
SET @sql := IF(
  @furnishing_col = 0,
  'ALTER TABLE project_units ADD COLUMN furnishing_id BIGINT UNSIGNED NULL AFTER parking',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @facing_col := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'project_units' AND COLUMN_NAME = 'facing_id'
);
SET @sql := IF(
  @facing_col = 0,
  'ALTER TABLE project_units ADD COLUMN facing_id BIGINT UNSIGNED NULL AFTER furnishing_id',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @fk_furnishing := (
  SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'project_units' AND CONSTRAINT_NAME = 'fk_project_units_furnishing'
);
SET @sql := IF(
  @fk_furnishing = 0,
  'ALTER TABLE project_units ADD CONSTRAINT fk_project_units_furnishing FOREIGN KEY (furnishing_id) REFERENCES furnishing_types (id)',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @fk_facing := (
  SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'project_units' AND CONSTRAINT_NAME = 'fk_project_units_facing'
);
SET @sql := IF(
  @fk_facing = 0,
  'ALTER TABLE project_units ADD CONSTRAINT fk_project_units_facing FOREIGN KEY (facing_id) REFERENCES facing_types (id)',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
