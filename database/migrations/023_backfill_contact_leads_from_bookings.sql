-- Migration 023: Backfill Contact Sellers bookings into leads
SET NAMES utf8mb4;

INSERT INTO leads
  (uuid, source, project_id, assigned_to_user_id, buyer_user_id,
   guest_name, guest_email, guest_phone, status, notes, created_by, created_at, updated_at)
SELECT
  UUID(),
  'contact',
  b.project_id,
  bp.user_id,
  b.buyer_user_id,
  COALESCE(
    NULLIF(TRIM(SUBSTRING_INDEX(SUBSTRING_INDEX(b.notes, 'Name: ', -1), '\n', 1)), ''),
    CONCAT(u.first_name, IF(u.last_name IS NULL OR u.last_name = '', '', CONCAT(' ', u.last_name)))
  ),
  COALESCE(
    NULLIF(TRIM(SUBSTRING_INDEX(SUBSTRING_INDEX(b.notes, 'Email: ', -1), '\n', 1)), ''),
    u.email
  ),
  COALESCE(
    NULLIF(TRIM(SUBSTRING_INDEX(SUBSTRING_INDEX(b.notes, 'Phone: ', -1), '\n', 1)), ''),
    u.phone
  ),
  'new',
  b.notes,
  b.buyer_user_id,
  b.created_at,
  b.created_at
FROM booking_requests b
INNER JOIN projects p ON p.id = b.project_id
INNER JOIN builder_profiles bp ON bp.id = p.builder_id
INNER JOIN users u ON u.id = b.buyer_user_id
WHERE b.deleted_at IS NULL
  AND b.notes LIKE 'Contact request%'
  AND NOT EXISTS (
    SELECT 1 FROM leads l
    WHERE l.deleted_at IS NULL
      AND l.source = 'contact'
      AND l.project_id = b.project_id
      AND l.buyer_user_id = b.buyer_user_id
      AND ABS(TIMESTAMPDIFF(SECOND, l.created_at, b.created_at)) < 120
  );
