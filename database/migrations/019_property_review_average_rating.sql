SET @db = DATABASE();

SET @col := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'properties' AND COLUMN_NAME = 'review_average_rating'
);
SET @sql := IF(
  @col = 0,
  'ALTER TABLE properties ADD COLUMN review_average_rating DECIMAL(3,1) UNSIGNED NULL AFTER submission_count',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @idx := (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'properties' AND INDEX_NAME = 'idx_properties_review_average_rating'
);
SET @sql := IF(
  @idx = 0,
  'CREATE INDEX idx_properties_review_average_rating ON properties (review_average_rating, status)',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Backfill from latest completed approved review sessions
UPDATE properties p
INNER JOIN (
  SELECT prs.property_id, ROUND(AVG(pri.rating), 1) AS avg_rating
  FROM property_review_sessions prs
  INNER JOIN property_review_items pri ON pri.session_id = prs.id
  INNER JOIN (
    SELECT property_id, MAX(completed_at) AS completed_at
    FROM property_review_sessions
    WHERE status = 'completed' AND decision = 'approved'
    GROUP BY property_id
  ) latest ON latest.property_id = prs.property_id AND latest.completed_at = prs.completed_at
  WHERE prs.status = 'completed' AND prs.decision = 'approved'
  GROUP BY prs.property_id
) rated ON rated.property_id = p.id
SET p.review_average_rating = rated.avg_rating
WHERE p.status = 'approved';
