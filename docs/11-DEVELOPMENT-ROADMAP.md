# 11. Module-by-Module Delivery Roadmap

## Mandatory Rule

```
APPROVED → Complete Module N (API + UI + DB as needed) → STOP → Await confirmation → Module N+1
```

- Never generate the whole project at once.
- Every module ships production-ready (validation, auth, errors, logging — no stubs).
- Schema changes land as migration + seeder updates for that module only.

---

## Module 0 — Project Foundation
**Scope**
- Create `client/`, `server/`, `database/`, `uploads/`, `docs/`, `nginx/`
- Express app: Helmet, CORS, rate limit, logger, error handler, env config
- MySQL pool + migration/seed runners
- React + Vite + Router + Bootstrap 5 + Axios + React Query + Context shells
- Global API response helpers
- `.env.example`, `.gitignore`, README

**Done when:** Both apps start; health check `GET /api/v1/health` returns OK.

**WAIT for approval before Module 1.**

---

## Module 1 — Authentication
- Users table (auth fields), refresh_tokens, email_verifications, password_resets, otp_challenges
- JWT access + refresh rotation
- Register, login, logout, refresh, forgot/reset, email verify, OTP (email channel; Twilio adapter stub)
- AuthContext, login/register/forgot pages, ProtectedRoute

**Done when:** Full auth cycle works end-to-end.

**WAIT.**

---

## Module 2 — RBAC (Roles & Permissions)
- roles, permissions, role_permissions, user_roles
- Seed all panel roles + permission codes
- Super Admin: Users, Roles, Permissions screens
- `authorize(permission)` middleware

**Done when:** Permission-denied paths return 403; SA can assign roles.

**WAIT.**

---

## Module 3 — Panel Shell & Masters
- PanelLayout, Sidebar per role, ThemeContext (dark-mode ready)
- Locations (country→state→city→locality)
- Amenities, property categories/types, lookup masters
- Super Admin Locations + Amenities + Settings

**Done when:** Cascading location selects work; masters seeded.

**WAIT.**

---

## Module 4 — Properties (Core)
- Properties schema + media (Multer + Sharp) + amenities + nearby + SEO
- Owner/Agent: My Properties, Add/Edit, Images/Videos/Documents, Property Status
- Public search + detail + map
- Wishlist / Compare (Buyer)
- View counter

**Done when:** Create → list → public detail with media.

**WAIT.**

---

## Module 5 — Approvals & Verification
- Admin: Property Approval, Property Verification, User Verification
- Agent: Profile Verification submit
- Support: Verification Requests queue
- Notifications on status change

**Done when:** Pending listing cannot appear in public search until approved.

**WAIT.**

---

## Module 6 — Leads, Visits, Inquiries
- Inquiry → Lead pipeline
- Site visits (book/confirm/complete)
- Buyer Book Site Visit; Agent/Owner/Builder visit lists
- Admin Leads

**Done when:** Buyer books visit → host sees request.

**WAIT.**

---

## Module 7 — Builder Projects & Inventory
- Builder profile, projects, towers, units, inventory, gallery, floor plans, brochure
- Booking requests
- Builder Team module
- Public project page

**Done when:** Builder publishes project with unit inventory.

**WAIT.**

---

## Module 8 — Chat & Notifications
- Conversations/messages REST + Socket.io
- In-app notifications
- Agent/Owner/Buyer/Support live chat screens

**Done when:** Two users exchange realtime messages.

**WAIT.**

---

## Module 9 — Reviews, Support, Property Reports
- Reviews + moderation
- Support tickets, complaints, FAQ
- Property reports (flag listing)
- Admin Support + Support Panel modules

**Done when:** Ticket thread + review moderation work.

**WAIT.**

---

## Module 10 — Subscriptions & Advertisements
- Plans, entitlements (listing limits)
- Agent/Owner subscription screens
- Super Admin subscriptions + advertisements
- Enforcement on publish

**Done when:** Over-limit publish blocked with upgrade path.

**WAIT.**

---

## Module 11 — CMS & SEO
- Blogs, news, static/city/builder pages, banners, FAQ, SEO fields
- CMS Panel + public renderers
- Super Admin CMS hub link

**Done when:** City page + blog render from CMS data.

**WAIT.**

---

## Module 12 — Reports & Dashboards
- Chart.js KPIs per panel
- Super Admin / Admin / Builder / Agent / Owner / Support reports
- Loan calculator (Buyer — client-side)

**Done when:** Dashboards show live aggregates from DB.

**WAIT.**

---

## Module 13 — Hardening & Deployment
- Security pass, indexes, Nginx + SSL + PM2 configs
- Backup notes, production env checklist
- Storage adapter documented for S3 swap

**Done when:** Deployable on Ubuntu VPS.

---

## Out of Scope (document only)
Tenant · CRM · Sales · Marketing · Finance · Legal · Twilio SMS production · S3 production cutover · Payment gateway

---

## Open Decisions (confirm with APPROVED)

1. Refresh token: **httpOnly cookie** (recommended) vs body/localStorage?
2. OTP MVP: **email only** (Twilio later)?
3. Brand accent: deep teal + charcoal (avoid purple/cream-AI defaults)?
4. Google Maps API key available for Module 4?
5. Multi-role per user in MVP: primary only, or `user_roles` multi?
