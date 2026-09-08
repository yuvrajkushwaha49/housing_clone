# 5. Module Flows

Each module follows the same backend pipeline:

```
HTTP Request
  → Helmet / CORS / Rate Limit
  → authenticate (optional|required)
  → authorize(permission)
  → validate(schema)
  → controller
  → service (transactions, business rules)
  → repository (parameterized SQL)
  → ApiResponse / ApiError
```

---

## Auth Module
- Register, login, OTP, refresh, verify email, reset password
- Issues JWT with claims: `sub`, `role`, `permissions[]` (or permission version hash)
- Refresh stored hashed in DB; rotation on use

## Users & RBAC Module
- CRUD users; assign roles; map permissions
- Super Admin cannot be soft-deleted without transfer

## Properties Module
- CRUD + search + media + amenities + SEO
- Status machine: `draft → pending → approved|rejected → sold|rented|archived`
- View counter: async insert + periodic rollup to `views_count`

## Projects Module
- Nested towers/units; inventory holds with expiry job
- Linking unit → property listing optional

## Leads Module
- Created from inquiry/visit/chat/ad click
- Assignment rules: property lister default; admin reassign

## Visits Module
- Request → confirm → complete/cancel/no_show
- Calendar conflicts checked per host_user_id

## Subscriptions Module
- Plan entitlements enforced in property create/publish
- Expiry job sets `expired` and demotes featured flags

## CMS Module
- Pages, blogs, news, banners, city/builder landing pages
- Publish workflow: draft → published

## Support Module
- Tickets + complaints + FAQ
- SLA fields reserved for future (`first_response_at`)

## Chat Module
- Conversation create on first message / inquiry
- Socket rooms scoped by conversationId + participant check

## Notifications Module
- Fan-out from domain events (approve, visit, message)
- Persist + push via Socket

## Reports Module
- Aggregations: listings by city, conversion, lead funnel, revenue (subscriptions)
- Read replicas ready (config flag later)

## Media Module
- Multer → storage adapter → DB metadata
- Image validation: mime allowlist, size caps, virus-scan hook reserved

## Settings Module
- Key-value platform config (site name, SMTP, map keys, feature flags)
