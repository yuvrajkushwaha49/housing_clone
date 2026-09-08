SET @db = DATABASE();

SET @field_col := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'project_review_items' AND COLUMN_NAME = 'field_key'
);
SET @sql := IF(
  @field_col = 0,
  'ALTER TABLE project_review_items ADD COLUMN field_key VARCHAR(80) NULL AFTER section_key',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
