-- Seeder 004: Subscription plans + sample CMS content
SET NAMES utf8mb4;

INSERT INTO subscription_plans
  (uuid, code, name, role_scope, price, duration_days, listing_limit, featured_limit, features, description, is_active, sort_order)
VALUES
  (UUID(), 'agent-free', 'Agent Free', 'agent', 0, 365, 3, 0,
   JSON_ARRAY('3 active listings','Basic support'), 'Starter plan for agents', 1, 1),
  (UUID(), 'agent-pro', 'Agent Pro', 'agent', 1999, 30, 25, 5,
   JSON_ARRAY('25 listings','5 featured','Priority support'), 'Professional agent plan', 1, 2),
  (UUID(), 'owner-free', 'Owner Free', 'owner', 0, 365, 2, 0,
   JSON_ARRAY('2 active listings'), 'List your own properties', 1, 1),
  (UUID(), 'owner-plus', 'Owner Plus', 'owner', 999, 30, 10, 2,
   JSON_ARRAY('10 listings','2 featured'), 'More visibility for owners', 1, 2),
  (UUID(), 'builder-starter', 'Builder Starter', 'builder', 4999, 30, 50, 10,
   JSON_ARRAY('50 listings','10 featured','Project spotlight'), 'Builder inventory plan', 1, 1)
ON DUPLICATE KEY UPDATE name = VALUES(name), listing_limit = VALUES(listing_limit);

INSERT INTO cms_pages
  (uuid, slug, title, body, page_type, status, meta_title, meta_description, published_at, created_at)
SELECT UUID(), 'about', 'About Hous',
  '<p>Hous is an enterprise real estate platform for buyers, owners, agents, and builders.</p><p>Search verified listings, book visits, and manage your pipeline from role-based panels.</p>',
  'static', 'published', 'About Hous', 'Learn about the Hous real estate platform', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM cms_pages WHERE slug = 'about' AND deleted_at IS NULL);

INSERT INTO cms_pages
  (uuid, slug, title, body, page_type, status, meta_title, meta_description, published_at)
SELECT UUID(), 'terms', 'Terms of Service',
  '<p>By using Hous you agree to list accurate property information and comply with applicable laws.</p>',
  'static', 'published', 'Terms of Service | Hous', 'Hous terms of service', NOW()
WHERE NOT EXISTS (SELECT 1 FROM cms_pages WHERE slug = 'terms' AND deleted_at IS NULL);

INSERT INTO cms_pages
  (uuid, slug, title, body, page_type, status, meta_title, meta_description, published_at)
SELECT UUID(), 'privacy', 'Privacy Policy',
  '<p>We collect account and listing data to operate the marketplace. Contact support to request data deletion.</p>',
  'static', 'published', 'Privacy Policy | Hous', 'Hous privacy policy', NOW()
WHERE NOT EXISTS (SELECT 1 FROM cms_pages WHERE slug = 'privacy' AND deleted_at IS NULL);

-- City landing pages for seeded cities (if any)
INSERT INTO cms_pages
  (uuid, slug, title, body, page_type, city_id, status, meta_title, meta_description, published_at)
SELECT UUID(), CONCAT('city-', c.slug), CONCAT('Properties in ', c.name),
  CONCAT('<p>Explore verified homes and commercial listings in ', c.name, '. Use Hous search filters to narrow by budget, BHK, and locality.</p>'),
  'city', c.id, 'published',
  CONCAT('Buy & Rent in ', c.name, ' | Hous'),
  CONCAT('Find properties in ', c.name),
  NOW()
FROM cities c
WHERE c.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM cms_pages p WHERE p.slug = CONCAT('city-', c.slug) AND p.deleted_at IS NULL
  );

INSERT INTO blogs
  (uuid, slug, title, excerpt, body, status, meta_title, published_at)
SELECT UUID(), 'how-to-list-your-property',
  'How to list your property on Hous',
  'A quick guide for owners and agents to publish a verified listing.',
  '<p>Create an Owner or Agent account, complete your profile, then add a property with photos and accurate location data.</p><p>Submit for approval — once live, buyers can inquire, chat, and book visits.</p>',
  'published', 'How to list your property | Hous', NOW()
WHERE NOT EXISTS (SELECT 1 FROM blogs WHERE slug = 'how-to-list-your-property' AND deleted_at IS NULL);

INSERT INTO blogs
  (uuid, slug, title, excerpt, body, status, meta_title, meta_description, published_at)
SELECT UUID(), 'first-time-home-buyer-checklist',
  'First-time home buyer checklist',
  'Documents, budget tips, and site-visit questions before you book a flat.',
  '<p>Buying your first home is exciting — and easier with a clear checklist.</p><ul><li><strong>Budget</strong> — fix an all-in budget including stamp duty, registration, and interiors.</li><li><strong>Loan pre-approval</strong> — get a sanction letter so negotiations are realistic.</li><li><strong>Documents</strong> — ask for title deed, approvals, and occupancy certificate where applicable.</li><li><strong>Site visit</strong> — check light, ventilation, parking, water pressure, and neighbourhood noise.</li><li><strong>Compare</strong> — shortlist 3 options on Workians before you pay a token.</li></ul>',
  'published', 'First-time home buyer checklist | Workians',
  'Documents, budget tips, and site-visit questions before you book a flat.', NOW()
WHERE NOT EXISTS (SELECT 1 FROM blogs WHERE slug = 'first-time-home-buyer-checklist' AND deleted_at IS NULL);

INSERT INTO blogs
  (uuid, slug, title, excerpt, body, status, meta_title, meta_description, published_at)
SELECT UUID(), 'how-to-verify-a-builder-project',
  'How to verify a builder project',
  'RERA, amenities, delivery timelines — what to check before you invest.',
  '<p>Before you book a under-construction or ready project, verify these basics:</p><ol><li><strong>RERA registration</strong> — confirm the project ID and promoter details.</li><li><strong>Approvals</strong> — layout plans, fire NOC, and environmental clearances where required.</li><li><strong>Delivery track record</strong> — past projects of the same builder.</li><li><strong>Amenities vs maintenance</strong> — ask for monthly costs.</li><li><strong>Unit inventory</strong> — carpet area, facing, floor plan, and parking allotment.</li></ol>',
  'published', 'How to verify a builder project | Workians',
  'RERA, amenities, delivery timelines — what to check before you invest.', NOW()
WHERE NOT EXISTS (SELECT 1 FROM blogs WHERE slug = 'how-to-verify-a-builder-project' AND deleted_at IS NULL);

INSERT INTO blogs
  (uuid, slug, title, excerpt, body, status, meta_title, meta_description, published_at)
SELECT UUID(), 'renting-vs-buying-in-2026',
  'Renting vs buying in 2026',
  'A practical comparison so you can choose what fits your city and career stage.',
  '<p>There is no one answer — it depends on how long you will stay, interest rates, and local rents.</p><p><strong>Rent if</strong> you may relocate in 2–3 years.</p><p><strong>Buy if</strong> you have stable income and plan to stay in the city.</p><p>Use Workians to compare sale and rent listings in the same locality.</p>',
  'published', 'Renting vs buying in 2026 | Workians',
  'A practical comparison so you can choose what fits your city and career stage.', NOW()
WHERE NOT EXISTS (SELECT 1 FROM blogs WHERE slug = 'renting-vs-buying-in-2026' AND deleted_at IS NULL);

INSERT INTO news
  (uuid, slug, title, excerpt, body, status, meta_title, published_at)
SELECT UUID(), 'hous-platform-launch',
  'Hous platform modules live',
  'Auth, listings, leads, chat, and CMS are available for early operators.',
  '<p>Operators can now manage locations, listings, leads, chat, support tickets, and subscription plans from their panels.</p>',
  'published', 'Hous launch update', NOW()
WHERE NOT EXISTS (SELECT 1 FROM news WHERE slug = 'hous-platform-launch' AND deleted_at IS NULL);

INSERT INTO news
  (uuid, slug, title, excerpt, body, status, meta_title, meta_description, published_at)
SELECT UUID(), 'workians-news-guides-live',
  'News & Guides is live on Workians',
  'Tips for buyers, sellers, and investors — now on the home page and /blog.',
  '<p>Workians now publishes News &amp; Guides to help you make clearer property decisions.</p><p>Find short checklists and how-tos on the home page and at <strong>/blog</strong>.</p>',
  'published', 'News & Guides is live on Workians',
  'Tips for buyers, sellers, and investors — now on the home page and /blog.', NOW()
WHERE NOT EXISTS (SELECT 1 FROM news WHERE slug = 'workians-news-guides-live' AND deleted_at IS NULL);

INSERT INTO banners
  (uuid, title, link_url, position, is_active, sort_order)
SELECT UUID(), 'Find your next home', '/search', 'home_top', 1, 1
WHERE NOT EXISTS (SELECT 1 FROM banners WHERE title = 'Find your next home' AND deleted_at IS NULL);

INSERT INTO advertisements
  (uuid, title, placement, link_url, is_active, sort_order)
SELECT UUID(), 'List with Hous Pro', 'search_sidebar', '/register', 1, 1
WHERE NOT EXISTS (SELECT 1 FROM advertisements WHERE title = 'List with Hous Pro' AND deleted_at IS NULL);
