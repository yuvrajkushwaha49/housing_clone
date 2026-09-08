-- Seeder 002: India sample locations, amenities, categories, lookups
SET NAMES utf8mb4;

INSERT INTO countries (uuid, name, iso2, phone_code, is_active)
SELECT UUID(), 'India', 'IN', '+91', 1
WHERE NOT EXISTS (SELECT 1 FROM countries WHERE iso2 = 'IN' AND deleted_at IS NULL);

SET @country_id = (SELECT id FROM countries WHERE iso2 = 'IN' AND deleted_at IS NULL LIMIT 1);

INSERT INTO states (uuid, country_id, name, code, is_active)
SELECT UUID(), @country_id, 'Maharashtra', 'MH', 1
WHERE NOT EXISTS (SELECT 1 FROM states WHERE country_id = @country_id AND name = 'Maharashtra' AND deleted_at IS NULL);

INSERT INTO states (uuid, country_id, name, code, is_active)
SELECT UUID(), @country_id, 'Karnataka', 'KA', 1
WHERE NOT EXISTS (SELECT 1 FROM states WHERE country_id = @country_id AND name = 'Karnataka' AND deleted_at IS NULL);

INSERT INTO states (uuid, country_id, name, code, is_active)
SELECT UUID(), @country_id, 'Delhi', 'DL', 1
WHERE NOT EXISTS (SELECT 1 FROM states WHERE country_id = @country_id AND name = 'Delhi' AND deleted_at IS NULL);

SET @mh_id = (SELECT id FROM states WHERE name = 'Maharashtra' AND deleted_at IS NULL LIMIT 1);
SET @ka_id = (SELECT id FROM states WHERE name = 'Karnataka' AND deleted_at IS NULL LIMIT 1);
SET @dl_id = (SELECT id FROM states WHERE name = 'Delhi' AND deleted_at IS NULL LIMIT 1);

INSERT INTO cities (uuid, state_id, name, slug, latitude, longitude, is_active)
SELECT UUID(), @mh_id, 'Mumbai', 'mumbai', 19.0760900, 72.8774260, 1
WHERE NOT EXISTS (SELECT 1 FROM cities WHERE slug = 'mumbai' AND deleted_at IS NULL);

INSERT INTO cities (uuid, state_id, name, slug, latitude, longitude, is_active)
SELECT UUID(), @mh_id, 'Pune', 'pune', 18.5204300, 73.8567440, 1
WHERE NOT EXISTS (SELECT 1 FROM cities WHERE slug = 'pune' AND deleted_at IS NULL);

INSERT INTO cities (uuid, state_id, name, slug, latitude, longitude, is_active)
SELECT UUID(), @ka_id, 'Bengaluru', 'bengaluru', 12.9715990, 77.5945660, 1
WHERE NOT EXISTS (SELECT 1 FROM cities WHERE slug = 'bengaluru' AND deleted_at IS NULL);

INSERT INTO cities (uuid, state_id, name, slug, latitude, longitude, is_active)
SELECT UUID(), @dl_id, 'New Delhi', 'new-delhi', 28.6139390, 77.2090210, 1
WHERE NOT EXISTS (SELECT 1 FROM cities WHERE slug = 'new-delhi' AND deleted_at IS NULL);

SET @mumbai_id = (SELECT id FROM cities WHERE slug = 'mumbai' LIMIT 1);
SET @pune_id = (SELECT id FROM cities WHERE slug = 'pune' LIMIT 1);
SET @blr_id = (SELECT id FROM cities WHERE slug = 'bengaluru' LIMIT 1);
SET @delhi_id = (SELECT id FROM cities WHERE slug = 'new-delhi' LIMIT 1);

INSERT INTO localities (uuid, city_id, name, slug, pincode, is_active)
SELECT UUID(), @mumbai_id, 'Andheri West', 'andheri-west', '400058', 1
WHERE NOT EXISTS (SELECT 1 FROM localities WHERE city_id = @mumbai_id AND slug = 'andheri-west' AND deleted_at IS NULL);

INSERT INTO localities (uuid, city_id, name, slug, pincode, is_active)
SELECT UUID(), @mumbai_id, 'Bandra West', 'bandra-west', '400050', 1
WHERE NOT EXISTS (SELECT 1 FROM localities WHERE city_id = @mumbai_id AND slug = 'bandra-west' AND deleted_at IS NULL);

INSERT INTO localities (uuid, city_id, name, slug, pincode, is_active)
SELECT UUID(), @pune_id, 'Hinjewadi', 'hinjewadi', '411057', 1
WHERE NOT EXISTS (SELECT 1 FROM localities WHERE city_id = @pune_id AND slug = 'hinjewadi' AND deleted_at IS NULL);

INSERT INTO localities (uuid, city_id, name, slug, pincode, is_active)
SELECT UUID(), @blr_id, 'Whitefield', 'whitefield', '560066', 1
WHERE NOT EXISTS (SELECT 1 FROM localities WHERE city_id = @blr_id AND slug = 'whitefield' AND deleted_at IS NULL);

INSERT INTO localities (uuid, city_id, name, slug, pincode, is_active)
SELECT UUID(), @delhi_id, 'Saket', 'saket', '110017', 1
WHERE NOT EXISTS (SELECT 1 FROM localities WHERE city_id = @delhi_id AND slug = 'saket' AND deleted_at IS NULL);

INSERT INTO amenities (uuid, code, name, icon, category, sort_order, is_active) VALUES
(UUID(), 'lift', 'Lift', 'bi-arrow-up-square', 'internal', 1, 1),
(UUID(), 'power_backup', 'Power Backup', 'bi-lightning-charge', 'internal', 2, 1),
(UUID(), 'parking', 'Parking', 'bi-p-square', 'internal', 3, 1),
(UUID(), 'security', '24x7 Security', 'bi-shield-check', 'external', 4, 1),
(UUID(), 'gym', 'Gym', 'bi-heart-pulse', 'external', 5, 1),
(UUID(), 'swimming_pool', 'Swimming Pool', 'bi-water', 'external', 6, 1),
(UUID(), 'clubhouse', 'Clubhouse', 'bi-building', 'external', 7, 1),
(UUID(), 'park', 'Park', 'bi-tree', 'nearby', 8, 1),
(UUID(), 'metro', 'Metro Nearby', 'bi-train-front', 'nearby', 9, 1),
(UUID(), 'school', 'School Nearby', 'bi-mortarboard', 'nearby', 10, 1)
ON DUPLICATE KEY UPDATE name = VALUES(name);

INSERT INTO property_categories (uuid, code, name, sort_order, is_active) VALUES
(UUID(), 'residential', 'Residential', 1, 1),
(UUID(), 'commercial', 'Commercial', 2, 1),
(UUID(), 'land', 'Land', 3, 1),
(UUID(), 'industrial', 'Industrial', 4, 1)
ON DUPLICATE KEY UPDATE name = VALUES(name);

SET @cat_res = (SELECT id FROM property_categories WHERE code = 'residential' LIMIT 1);
SET @cat_com = (SELECT id FROM property_categories WHERE code = 'commercial' LIMIT 1);
SET @cat_land = (SELECT id FROM property_categories WHERE code = 'land' LIMIT 1);
SET @cat_ind = (SELECT id FROM property_categories WHERE code = 'industrial' LIMIT 1);

INSERT INTO property_types (uuid, category_id, code, name, sort_order, is_active) VALUES
(UUID(), @cat_res, 'apartment', 'Apartment', 1, 1),
(UUID(), @cat_res, 'villa', 'Villa', 2, 1),
(UUID(), @cat_res, 'independent_house', 'Independent House', 3, 1),
(UUID(), @cat_res, 'builder_floor', 'Builder Floor', 4, 1),
(UUID(), @cat_res, 'studio', 'Studio', 5, 1),
(UUID(), @cat_res, 'farm_house', 'Farm House', 6, 1),
(UUID(), @cat_res, 'hostel', 'Hostel', 7, 1),
(UUID(), @cat_com, 'office', 'Office', 8, 1),
(UUID(), @cat_com, 'shop', 'Shop', 9, 1),
(UUID(), @cat_land, 'plot', 'Plot', 10, 1),
(UUID(), @cat_ind, 'warehouse', 'Warehouse', 11, 1)
ON DUPLICATE KEY UPDATE name = VALUES(name);

INSERT INTO area_units (code, name) VALUES
('sqft', 'Sq. Ft.'),
('sqyd', 'Sq. Yd.'),
('sqm', 'Sq. M.'),
('acre', 'Acre'),
('hectare', 'Hectare')
ON DUPLICATE KEY UPDATE name = VALUES(name);

INSERT INTO facing_types (code, name) VALUES
('east', 'East'),
('west', 'West'),
('north', 'North'),
('south', 'South'),
('north_east', 'North-East'),
('north_west', 'North-West'),
('south_east', 'South-East'),
('south_west', 'South-West')
ON DUPLICATE KEY UPDATE name = VALUES(name);

INSERT INTO furnishing_types (code, name) VALUES
('unfurnished', 'Unfurnished'),
('semi_furnished', 'Semi Furnished'),
('fully_furnished', 'Fully Furnished')
ON DUPLICATE KEY UPDATE name = VALUES(name);

INSERT INTO ownership_types (code, name) VALUES
('freehold', 'Freehold'),
('leasehold', 'Leasehold'),
('cooperative', 'Co-operative Society'),
('power_of_attorney', 'Power of Attorney')
ON DUPLICATE KEY UPDATE name = VALUES(name);

INSERT INTO construction_statuses (code, name) VALUES
('ready_to_move', 'Ready to Move'),
('under_construction', 'Under Construction'),
('new_launch', 'New Launch')
ON DUPLICATE KEY UPDATE name = VALUES(name);
