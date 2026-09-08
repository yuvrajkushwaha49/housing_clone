-- Unit ready-to-move flag and delivery / possession date
SET @db = DATABASE();

SET @ready_col := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'project_units' AND COLUMN_NAME = 'is_ready_to_move'
);
SET @sql := IF(
  @ready_col = 0,
  'ALTER TABLE project_units ADD COLUMN is_ready_to_move TINYINT(1) NOT NULL DEFAULT 0 AFTER status',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @delivery_col := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'project_units' AND COLUMN_NAME = 'delivery_date'
);
SET @sql := IF(
  @delivery_col = 0,
  'ALTER TABLE project_units ADD COLUMN delivery_date DATE NULL AFTER is_ready_to_move',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
