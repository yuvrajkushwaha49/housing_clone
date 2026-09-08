-- Per-user bonus posting limits (super admin can increase unit posting quota)
SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS subscription_entitlement_overrides (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  listing_limit_bonus INT UNSIGNED NOT NULL DEFAULT 0,
  featured_limit_bonus INT UNSIGNED NOT NULL DEFAULT 0,
  notes VARCHAR(500) NULL,
  expires_at DATETIME NULL,
  created_by BIGINT UNSIGNED NULL,
  updated_by BIGINT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_entitlement_override_user (user_id),
  CONSTRAINT fk_entitlement_override_user FOREIGN KEY (user_id) REFERENCES users (id),
  CONSTRAINT fk_entitlement_override_created FOREIGN KEY (created_by) REFERENCES users (id),
  CONSTRAINT fk_entitlement_override_updated FOREIGN KEY (updated_by) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
