-- Seeder 001: System roles and permissions
SET NAMES utf8mb4;

INSERT INTO roles (uuid, code, name, description, is_system) VALUES
(UUID(), 'SUPER_ADMIN', 'Super Admin', 'Full platform control', 1),
(UUID(), 'ADMIN', 'Admin', 'Operations and moderation', 1),
(UUID(), 'BUILDER', 'Builder', 'Project and inventory management', 1),
(UUID(), 'AGENT', 'Agent', 'Property listings and leads', 1),
(UUID(), 'OWNER', 'Owner', 'Own property management', 1),
(UUID(), 'BUYER', 'Buyer', 'Search and engage with listings', 1),
(UUID(), 'SUPPORT', 'Support', 'Tickets and live chat', 1),
(UUID(), 'CMS_MANAGER', 'CMS Manager', 'Content and SEO management', 1)
ON DUPLICATE KEY UPDATE name = VALUES(name);

INSERT INTO permissions (uuid, code, module, name, description) VALUES
(UUID(), 'dashboard.view', 'dashboard', 'View Dashboard', 'Access role dashboard'),
(UUID(), 'users.read', 'users', 'Read Users', 'List and view users'),
(UUID(), 'users.create', 'users', 'Create Users', 'Create users'),
(UUID(), 'users.update', 'users', 'Update Users', 'Update users'),
(UUID(), 'users.delete', 'users', 'Delete Users', 'Soft delete users'),
(UUID(), 'users.suspend', 'users', 'Suspend Users', 'Change user status'),
(UUID(), 'roles.read', 'roles', 'Read Roles', 'List roles'),
(UUID(), 'roles.create', 'roles', 'Create Roles', 'Create roles'),
(UUID(), 'roles.update', 'roles', 'Update Roles', 'Update roles'),
(UUID(), 'roles.delete', 'roles', 'Delete Roles', 'Delete non-system roles'),
(UUID(), 'roles.assign_permissions', 'roles', 'Assign Permissions', 'Map permissions to roles'),
(UUID(), 'permissions.read', 'permissions', 'Read Permissions', 'List permissions'),
(UUID(), 'settings.read', 'settings', 'Read Settings', 'View platform settings'),
(UUID(), 'settings.update', 'settings', 'Update Settings', 'Update platform settings'),
(UUID(), 'reports.view', 'reports', 'View Reports', 'Access reports'),
(UUID(), 'audit.read', 'audit', 'Read Audit Logs', 'View audit trail'),
(UUID(), 'properties.read', 'properties', 'Read Properties', 'View properties'),
(UUID(), 'properties.create', 'properties', 'Create Properties', 'Create properties'),
(UUID(), 'properties.update', 'properties', 'Update Properties', 'Update properties'),
(UUID(), 'properties.delete', 'properties', 'Delete Properties', 'Delete properties'),
(UUID(), 'properties.approve', 'properties', 'Approve Properties', 'Approve or reject listings'),
(UUID(), 'properties.verify', 'properties', 'Verify Properties', 'Verify property details'),
(UUID(), 'projects.read', 'projects', 'Read Projects', 'View projects'),
(UUID(), 'projects.create', 'projects', 'Create Projects', 'Create projects'),
(UUID(), 'projects.update', 'projects', 'Update Projects', 'Update projects'),
(UUID(), 'projects.delete', 'projects', 'Delete Projects', 'Delete projects'),
(UUID(), 'leads.read', 'leads', 'Read Leads', 'View leads'),
(UUID(), 'leads.manage', 'leads', 'Manage Leads', 'Update lead status'),
(UUID(), 'tickets.read', 'tickets', 'Read Tickets', 'View support tickets'),
(UUID(), 'tickets.manage', 'tickets', 'Manage Tickets', 'Handle support tickets'),
(UUID(), 'cms.manage', 'cms', 'Manage CMS', 'Manage CMS content'),
(UUID(), 'subscriptions.manage', 'subscriptions', 'Manage Subscriptions', 'Manage plans and subscriptions'),
(UUID(), 'advertisements.manage', 'advertisements', 'Manage Ads', 'Manage advertisements'),
(UUID(), 'locations.manage', 'locations', 'Manage Locations', 'Manage geo masters'),
(UUID(), 'amenities.manage', 'amenities', 'Manage Amenities', 'Manage amenities'),
(UUID(), 'categories.manage', 'categories', 'Manage Categories', 'Manage property categories'),
(UUID(), 'reviews.moderate', 'reviews', 'Moderate Reviews', 'Approve or reject reviews'),
(UUID(), 'notifications.send', 'notifications', 'Send Notifications', 'Broadcast notifications'),
(UUID(), 'chat.access', 'chat', 'Access Chat', 'Use messaging'),
(UUID(), 'users.verify', 'users', 'Verify Users', 'Verify agent/owner/builder profiles')
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- Super Admin: all permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.code = 'SUPER_ADMIN' AND p.deleted_at IS NULL
ON DUPLICATE KEY UPDATE role_id = role_id;

-- Admin
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r
JOIN permissions p ON p.code IN (
  'dashboard.view','users.read','users.suspend','users.verify',
  'properties.read','properties.approve','properties.verify',
  'projects.read','leads.read','leads.manage','tickets.read','tickets.manage',
  'reviews.moderate','notifications.send','reports.view','chat.access',
  'subscriptions.manage','advertisements.manage','cms.manage'
)
WHERE r.code = 'ADMIN'
ON DUPLICATE KEY UPDATE role_id = role_id;

-- Builder
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r
JOIN permissions p ON p.code IN (
  'dashboard.view','projects.read','projects.create','projects.update','projects.delete',
  'leads.read','leads.manage','reports.view','chat.access'
)
WHERE r.code = 'BUILDER'
ON DUPLICATE KEY UPDATE role_id = role_id;

-- Agent
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r
JOIN permissions p ON p.code IN (
  'dashboard.view','properties.read','properties.create','properties.update','properties.delete',
  'leads.read','leads.manage','chat.access','reports.view'
)
WHERE r.code = 'AGENT'
ON DUPLICATE KEY UPDATE role_id = role_id;

-- Owner
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r
JOIN permissions p ON p.code IN (
  'dashboard.view','properties.read','properties.create','properties.update','properties.delete',
  'leads.read','chat.access','reports.view'
)
WHERE r.code = 'OWNER'
ON DUPLICATE KEY UPDATE role_id = role_id;

-- Buyer
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r
JOIN permissions p ON p.code IN (
  'dashboard.view','properties.read','leads.read','chat.access','reports.view'
)
WHERE r.code = 'BUYER'
ON DUPLICATE KEY UPDATE role_id = role_id;

-- Support
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r
JOIN permissions p ON p.code IN (
  'dashboard.view','tickets.read','tickets.manage','chat.access','users.verify','reports.view'
)
WHERE r.code = 'SUPPORT'
ON DUPLICATE KEY UPDATE role_id = role_id;

-- CMS Manager
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r
JOIN permissions p ON p.code IN (
  'dashboard.view','cms.manage'
)
WHERE r.code = 'CMS_MANAGER'
ON DUPLICATE KEY UPDATE role_id = role_id;
