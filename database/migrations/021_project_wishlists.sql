CREATE TABLE IF NOT EXISTS project_wishlists (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  project_id BIGINT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_project_wishlist_user_project (user_id, project_id),
  CONSTRAINT fk_project_wishlist_user FOREIGN KEY (user_id) REFERENCES users (id),
  CONSTRAINT fk_project_wishlist_project FOREIGN KEY (project_id) REFERENCES projects (id)
);

CREATE INDEX idx_project_wishlists_user ON project_wishlists (user_id, created_at);
