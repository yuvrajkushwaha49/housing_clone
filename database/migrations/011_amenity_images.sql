-- Master amenity default image + project-specific amenity photo
SET @db = DATABASE();

SET @amenity_col := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'amenities' AND COLUMN_NAME = 'image_path'
);
SET @sql := IF(
  @amenity_col = 0,
  'ALTER TABLE amenities ADD COLUMN image_path VARCHAR(500) NULL AFTER icon',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @project_amenity_col := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'project_amenities' AND COLUMN_NAME = 'image_path'
);
SET @sql := IF(
  @project_amenity_col = 0,
  'ALTER TABLE project_amenities ADD COLUMN image_path VARCHAR(500) NULL AFTER amenity_id',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
