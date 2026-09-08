SET @db = DATABASE();

SET @col := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'properties' AND COLUMN_NAME = 'plot_amenities'
);
SET @sql := IF(
  @col = 0,
  'ALTER TABLE properties ADD COLUMN plot_amenities JSON NULL AFTER meta_keywords',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
