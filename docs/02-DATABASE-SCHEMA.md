# 2. Database Schema

**Engine:** InnoDB · **Charset:** utf8mb4 · **Collation:** utf8mb4_unicode_ci  
**Convention:** `snake_case` tables/columns · Surrogate `BIGINT UNSIGNED` PKs · Public `uuid` CHAR(36) where exposed · Soft delete via `deleted_at`  
**Audit columns (mutable entities):** `created_at`, `updated_at`, `created_by`, `updated_by`, `deleted_at`  
**Artifacts:** `database/schema.sql` (full) + `database/migrations/*.sql` (incremental) + `database/seeders/*.sql`

**Media note:** Files stored via Multer; images processed with Sharp (webp/jpeg variants + max dimensions) before persist. Paths only in DB — never duplicate binary data.

---

## 2.1 Core Identity & RBAC

### `users`
| Column | Type | Notes |
|--------|------|-------|
| id | BIGINT PK AI | |
| uuid | CHAR(36) UNIQUE | Public identifier |
| email | VARCHAR(255) UNIQUE | |
| phone | VARCHAR(20) UNIQUE NULL | |
| password_hash | VARCHAR(255) NULL | Null for OTP-only until set |
| first_name | VARCHAR(100) | |
| last_name | VARCHAR(100) NULL | |
| avatar_url | VARCHAR(500) NULL | |
| email_verified_at | DATETIME NULL | |
| phone_verified_at | DATETIME NULL | |
| status | ENUM('pending','active','suspended','banned') | Default `pending` |
| primary_role_id | BIGINT FK → roles.id | |
| last_login_at | DATETIME NULL | |
| created_at / updated_at / created_by / updated_by / deleted_at | | |

### `roles`
| Column | Type |
|--------|------|
| id | BIGINT PK |
| code | VARCHAR(50) UNIQUE | e.g. `SUPER_ADMIN` |
| name | VARCHAR(100) |
| description | VARCHAR(255) NULL |
| is_system | TINYINT(1) | Cannot delete system roles |
| audit + soft delete | |

### `permissions`
| Column | Type |
|--------|------|
| id | BIGINT PK |
| code | VARCHAR(100) UNIQUE | e.g. `property.approve` |
| module | VARCHAR(50) | e.g. `properties` |
| name | VARCHAR(150) |
| description | VARCHAR(255) NULL |

### `role_permissions`
| role_id | permission_id | PK(role_id, permission_id) |

### `user_roles`
| user_id | role_id | assigned_at | assigned_by | PK(user_id, role_id) |

### `refresh_tokens`
| Column | Type |
|--------|------|
| id | BIGINT PK |
| user_id | FK users |
| token_hash | VARCHAR(255) UNIQUE |
| expires_at | DATETIME |
| revoked_at | DATETIME NULL |
| user_agent | VARCHAR(255) NULL |
| ip_address | VARCHAR(45) NULL |
| created_at | DATETIME |

### `email_verifications`
| id | user_id | token_hash | expires_at | consumed_at | created_at |

### `password_resets`
| id | user_id | token_hash | expires_at | consumed_at | created_at |

### `otp_challenges`
| id | user_id NULL | channel ENUM('email','sms') | destination | otp_hash | purpose ENUM('login','verify_phone','verify_email') | attempts | expires_at | consumed_at | created_at |

---

## 2.2 Profiles (role-specific)

### `builder_profiles`
| id | user_id UK | company_name | legal_name | gstin | rera_number | logo_url | website | about | year_established | address | city_id | verification_status | audit |

### `agent_profiles`
| id | user_id UK | agency_name | license_number | bio | experience_years | city_id | verification_status | audit |

### `owner_profiles`
| id | user_id UK | bio | preferred_contact | verification_status | audit |

### `buyer_profiles`
| id | user_id UK | budget_min | budget_max | preferred_cities JSON | preferred_types JSON | audit |

---

## 2.3 Locations & Master Data

### `countries` · `states` · `cities` · `localities`
Hierarchical location with `slug`, `name`, `is_active`, lat/lng where useful, SEO fields on cities/localities.

### `amenities`
| id | code UK | name | icon | category ENUM('internal','external','nearby') | is_active | sort_order | audit |

### `property_categories`
| id | code UK | name | sort_order |  e.g. residential, commercial |

### `property_types`
| id | category_id FK | code UK | name |  apartment, villa, office, warehouse, land, pg, hostel, ... |

### `facing_types` · `furnishing_types` · `ownership_types` · `construction_statuses` · `area_units`
Lookup tables for filterable enums (seeded).

---

## 2.4 Properties

### `properties`
| Column | Type | Notes |
|--------|------|-------|
| id | BIGINT PK | |
| uuid | CHAR(36) UK | |
| slug | VARCHAR(255) UK | SEO |
| title | VARCHAR(255) | |
| description | TEXT | |
| category_id | FK | |
| property_type_id | FK | |
| purpose | ENUM('sale','rent','lease','pg') | |
| price | DECIMAL(15,2) | |
| price_negotiable | TINYINT(1) | |
| area | DECIMAL(12,2) | |
| area_unit_id | FK | |
| carpet_area | DECIMAL(12,2) NULL | |
| bedrooms | TINYINT NULL | |
| bathrooms | TINYINT NULL | |
| balconies | TINYINT NULL | |
| parking | TINYINT NULL | |
| facing_id | FK NULL | |
| furnishing_id | FK NULL | |
| ownership_id | FK NULL | |
| construction_status_id | FK NULL | |
| floor_number | INT NULL | |
| total_floors | INT NULL | |
| age_years | INT NULL | |
| listed_by_type | ENUM('owner','agent','builder') | |
| listed_by_user_id | FK users | |
| builder_id | FK builder_profiles NULL | |
| project_id | FK projects NULL | |
| unit_id | FK project_units NULL | |
| country_id / state_id / city_id / locality_id | FK | |
| address_line | VARCHAR(500) | |
| landmark | VARCHAR(255) NULL | |
| pincode | VARCHAR(12) NULL | |
| latitude | DECIMAL(10,7) NULL | |
| longitude | DECIMAL(10,7) NULL | |
| status | ENUM('draft','pending','approved','rejected','sold','rented','archived') | |
| verification_status | ENUM('unverified','pending','verified','rejected') | |
| is_featured | TINYINT(1) | |
| is_premium | TINYINT(1) | |
| views_count | INT DEFAULT 0 | |
| published_at | DATETIME NULL | |
| approved_at / approved_by | | |
| rejection_reason | TEXT NULL | |
| meta_title / meta_description / meta_keywords | SEO | |
| audit + soft delete | |

**Indexes:** `(status, purpose, city_id)`, `(property_type_id)`, `(price)`, `(listed_by_user_id)`, `(slug)`, FULLTEXT `(title, description)`

### `property_amenities`
| property_id | amenity_id | PK |

### `property_nearby_places`
| id | property_id | place_type | name | distance_km | audit |

### `property_media`
| id | property_id | media_type ENUM('image','video','floor_plan','brochure','document') | file_path | file_name | mime_type | file_size | sort_order | is_primary | title NULL | audit |

### `property_views`
| id | property_id | viewer_user_id NULL | ip_hash | viewed_at | UNIQUE daily rollup optional via job |

### `wishlists`
| id | user_id | property_id | created_at | UK(user_id, property_id) |

### `property_compares`
| id | user_id | property_id | created_at | UK(user_id, property_id) | Max 4 enforced in service |

---

## 2.5 Projects (Builder)

### `projects`
| id | uuid | slug | builder_id | name | description | category_id | city_id | locality_id | address | lat/lng | rera_id | launch_date | possession_date | status ENUM(...) | verification_status | brochure_path | seo fields | audit |

### `project_towers`
| id | project_id | name | total_floors | total_units | audit |

### `project_units`
| id | tower_id NULL | project_id | unit_number | unit_type | bedrooms | bathrooms | area | area_unit_id | price | floor_number | status ENUM('available','held','sold','blocked') | property_id NULL | audit |

### `project_media` — same pattern as property_media

### `project_amenities` — M2M

### `inventory_holds`
| id | unit_id | held_by_user_id | expires_at | status | audit |

### `builder_team_members`
| id | builder_id | user_id NULL | name | email | phone | role_title | permissions_json | status | invited_at | audit |
| Notes: Builder Panel **Team** module; optional linked `user_id` when teammate has login |

---

## 2.6 Leads, Visits, Inquiries

### `leads`
| id | source ENUM('inquiry','visit','chat','call','ad') | property_id NULL | project_id NULL | assigned_to_user_id | buyer_user_id NULL | guest_name/email/phone | status ENUM('new','contacted','qualified','negotiation','won','lost') | notes | audit |

### `inquiries`
| id | property_id NULL | project_id NULL | user_id NULL | name | email | phone | message | status | lead_id NULL | audit |

### `site_visits`
| id | property_id NULL | project_id NULL | requester_user_id | host_user_id | scheduled_at | status ENUM('requested','confirmed','completed','cancelled','no_show') | notes | audit |

### `booking_requests`
| id | project_id | unit_id NULL | buyer_user_id | amount | status | notes | audit |

---

## 2.7 Subscriptions & Ads

### `subscription_plans`
| id | code UK | name | role_scope ENUM('agent','owner','builder') | price | duration_days | listing_limit | featured_limit | features JSON | is_active | audit |

### `subscriptions`
| id | user_id | plan_id | starts_at | ends_at | status ENUM('active','expired','cancelled') | payment_ref NULL | audit |

### `advertisements`
| id | title | placement | image_path | link_url | starts_at | ends_at | is_active | sort_order | city_id NULL | audit |

---

## 2.8 CMS

### `cms_pages`
| id | slug UK | title | body HTML | page_type ENUM('static','city','builder','custom') | city_id NULL | builder_id NULL | seo | status | published_at | audit |

### `blogs`
| id | slug UK | title | excerpt | body | cover_image | author_id | status | published_at | seo | audit |

### `news`
| Same shape as blogs (or `content_type` discriminator — prefer separate table for indexing clarity)

### `banners`
| id | title | image_path | link_url | position | starts_at | ends_at | is_active | audit |

### `faqs`
| id | category | question | answer | sort_order | is_active | audit |

---

## 2.9 Support & Reviews

### `support_tickets`
| id | ticket_number UK | user_id | assigned_to NULL | subject | category | priority | status | audit |

### `support_ticket_messages`
| id | ticket_id | sender_user_id | message | attachments JSON | created_at |

### `complaints`
| id | user_id | against_type | against_id | subject | description | status | audit |

### `property_reports`
| id | reporter_user_id NULL | property_id | reason ENUM(...) | details | status ENUM('open','reviewing','resolved','dismissed') | handled_by | audit |
| Notes: Support Panel **Property Reports** |

### `verification_requests`
| id | user_id | profile_type ENUM('agent','owner','builder') | documents JSON | status | reviewed_by | notes | audit |
| Notes: Agent **Profile Verification** + Support/Admin queues |

### `reviews`
| id | property_id NULL | project_id NULL | user_id | rating TINYINT 1-5 | title | body | status ENUM('pending','approved','rejected') | audit |

---

## 2.10 Chat, Notifications, Settings

### `conversations`
| id | type ENUM('direct','support','property') | property_id NULL | created_at |

### `conversation_participants`
| conversation_id | user_id | last_read_at | PK |

### `messages`
| id | conversation_id | sender_user_id | body | attachments JSON | created_at | deleted_at |

### `notifications`
| id | user_id | type | title | body | data JSON | is_read | created_at |

### `settings`
| id | `key` UK | value TEXT | group_name | updated_at | updated_by |

### `audit_logs`
| id | actor_user_id | action | entity_type | entity_id | old_values JSON | new_values JSON | ip | created_at |

---

## 2.11 Naming & Constraints Summary

- All FKs: `ON UPDATE CASCADE`, soft-delete aware (no cascade hard delete of parents with children).
- Money: `DECIMAL(15,2)`.
- Geo: `DECIMAL(10,7)`.
- Status transitions enforced in **service layer**, not DB triggers (except optional CHECK on rating).
- UUID for public URLs; numeric id for joins.

Full DDL will live in `/database/schema/*.sql` after approval.
