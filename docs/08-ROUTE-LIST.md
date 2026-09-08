# 8. Route List (Revised)

## Frontend — Public
`/`, `/search`, `/property/:slug`, `/project/:slug`, `/builders/:slug`, `/city/:slug`, `/blog`, `/blog/:slug`, `/news`, `/news/:slug`, `/page/:slug`, `/login`, `/register`, `/login/otp`, `/forgot-password`, `/reset-password`, `/verify-email`

## Frontend — Panels

### Super Admin `/panel/super-admin`
`/dashboard`, `/users`, `/roles`, `/permissions`, `/properties`, `/projects`, `/builders`, `/agents`, `/owners`, `/buyers`, `/subscriptions`, `/advertisements`, `/cms`, `/locations`, `/amenities`, `/reports`, `/settings`

### Admin `/panel/admin`
`/dashboard`, `/approvals/properties`, `/verification/properties`, `/verification/users`, `/leads`, `/support`, `/reviews`, `/notifications`, `/reports`

### Builder `/panel/builder`
`/dashboard`, `/profile`, `/projects`, `/projects/new`, `/projects/:id`, `/projects/:id/towers`, `/projects/:id/units`, `/projects/:id/inventory`, `/projects/:id/gallery`, `/projects/:id/floor-plans`, `/projects/:id/brochure`, `/leads`, `/visits`, `/bookings`, `/team`, `/reports`

### Agent `/panel/agent`
`/dashboard`, `/properties`, `/properties/new`, `/properties/status`, `/leads`, `/visits`, `/chat`, `/subscription`, `/verification`, `/reports`

### Owner `/panel/owner`
`/dashboard`, `/properties`, `/properties/new`, `/properties/:id/edit`, `/properties/:id/images`, `/properties/:id/videos`, `/properties/:id/documents`, `/properties/:id/analytics`, `/interested`, `/visits`, `/chat`, `/subscription`

### Buyer `/panel/buyer`
`/dashboard`, `/search`, `/saved`, `/compare`, `/visits`, `/chat`, `/reviews`, `/loan-calculator`, `/profile`, `/notifications`

### Support `/panel/support`
`/dashboard`, `/tickets`, `/tickets/:id`, `/chat`, `/complaints`, `/property-reports`, `/verification-requests`, `/faqs`

### CMS `/panel/cms`
`/dashboard`, `/blogs`, `/news`, `/city-pages`, `/builder-pages`, `/static-pages`, `/faqs`, `/seo`, `/banners`

### Future (not mounted)
`/panel/tenant/*`, `/panel/crm/*`, `/panel/sales/*`, `/panel/marketing/*`, `/panel/finance/*`, `/panel/legal/*`

---

## Backend — `/api/v1`

| Mount | Purpose |
|-------|---------|
| `/auth` | Register, login, refresh, OTP, password, verify |
| `/users` | User CRUD |
| `/roles` | Roles |
| `/permissions` | Permissions |
| `/builders` `/agents` `/owners` `/buyers` | Directories + profiles |
| `/locations` `/amenities` `/masters` | Geo + lookups |
| `/properties` | CRUD, search, media, status |
| `/projects` | Projects, towers, units, gallery |
| `/inventory` | Holds / availability |
| `/teams` | Builder team members |
| `/wishlist` `/compare` | Buyer tools |
| `/leads` `/inquiries` `/visits` `/bookings` | Demand funnel |
| `/subscriptions` `/subscription-plans` | Monetization |
| `/advertisements` | Ads |
| `/cms` | Pages, blogs, news, banners, FAQ, SEO |
| `/tickets` `/complaints` `/property-reports` | Support |
| `/conversations` | Chat REST |
| `/notifications` | In-app |
| `/reviews` | Reviews |
| `/reports` | Analytics aggregates |
| `/settings` | Platform config |
| `/uploads` | Multer + Sharp pipeline |
| `/admin/*` | Approval / verification actions |
