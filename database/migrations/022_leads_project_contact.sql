-- Migration 022: Project contact leads (Contact Sellers)
SET NAMES utf8mb4;

ALTER TABLE leads
  MODIFY COLUMN source ENUM('inquiry','visit','chat','call','ad','manual','contact') NOT NULL DEFAULT 'inquiry';

ALTER TABLE leads
  ADD COLUMN project_id BIGINT UNSIGNED NULL AFTER property_id,
  ADD KEY idx_leads_project (project_id),
  ADD CONSTRAINT fk_leads_project FOREIGN KEY (project_id) REFERENCES projects (id);

-- Buyers can view their own submitted contact / inquiry leads
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.code = 'leads.read'
WHERE r.code = 'BUYER'
ON DUPLICATE KEY UPDATE role_id = role_id;
