-- Migration 010: Active flag for project buildings and towers
SET NAMES utf8mb4;

ALTER TABLE project_buildings
  ADD COLUMN is_active TINYINT(1) NOT NULL DEFAULT 1 AFTER sort_order;

ALTER TABLE project_towers
  ADD COLUMN is_active TINYINT(1) NOT NULL DEFAULT 1 AFTER sort_order;
