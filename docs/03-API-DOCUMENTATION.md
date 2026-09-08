# 3. API Documentation

**Base URL:** `https://{host}/api/v1`  
**Auth:** `Authorization: Bearer <access_token>`  
**Refresh:** `POST /auth/refresh` with httpOnly cookie or body `refresh_token`  
**Content-Type:** `application/json` (except multipart uploads)

## Response Envelope

```json
{
  "success": true,
  "message": "Optional human message",
  "data": {},
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

## Error Envelope

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [{ "field": "email", "message": "Invalid email" }],
  "code": "VALIDATION_ERROR"
}
```

## HTTP Status Codes

| Code | Usage |
|------|-------|
| 200 | OK |
| 201 | Created |
| 204 | No Content |
| 400 | Bad Request / validation |
| 401 | Unauthenticated |
| 403 | Forbidden (RBAC) |
| 404 | Not Found |
| 409 | Conflict |
| 422 | Unprocessable |
| 429 | Rate limited |
| 500 | Server error |

---

## 3.1 Auth

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/register` | Public | Register (role: buyer/owner/agent/builder) |
| POST | `/auth/login` | Public | Email/password → access + refresh |
| POST | `/auth/otp/request` | Public | Request OTP |
| POST | `/auth/otp/verify` | Public | Verify OTP → tokens |
| POST | `/auth/refresh` | Public* | Rotate refresh token |
| POST | `/auth/logout` | Auth | Revoke refresh |
| POST | `/auth/forgot-password` | Public | Send reset email |
| POST | `/auth/reset-password` | Public | Reset with token |
| POST | `/auth/verify-email` | Public | Consume email token |
| POST | `/auth/resend-verification` | Auth | Resend email |
| GET | `/auth/me` | Auth | Current user + permissions |

---

## 3.2 Users & RBAC

| Method | Path | Permission |
|--------|------|------------|
| GET | `/users` | `users.read` |
| GET | `/users/:id` | `users.read` |
| POST | `/users` | `users.create` |
| PUT | `/users/:id` | `users.update` |
| PATCH | `/users/:id/status` | `users.suspend` |
| DELETE | `/users/:id` | `users.delete` |
| GET | `/roles` | `roles.read` |
| POST | `/roles` | `roles.create` |
| PUT | `/roles/:id` | `roles.update` |
| PUT | `/roles/:id/permissions` | `roles.assign_permissions` |
| GET | `/permissions` | `roles.read` |

---

## 3.3 Profiles

| Method | Path | Notes |
|--------|------|-------|
| GET/PUT | `/profiles/me` | Role-aware profile |
| GET/PUT | `/builders/:id` | Public GET; owner/admin PUT |
| GET | `/builders` | Directory + admin list |
| PATCH | `/builders/:id/verify` | `builders.verify` |
| Same pattern | `/agents`, `/owners` | |

---

## 3.4 Locations & Masters

| Method | Path |
|--------|------|
| GET | `/locations/countries` |
| GET | `/locations/states?countryId=` |
| GET | `/locations/cities?stateId=` |
| GET | `/locations/localities?cityId=` |
| CRUD | `/admin/locations/...` | Admin only |
| GET | `/amenities` |
| CRUD | `/admin/amenities` |
| GET | `/masters/property-types` |
| GET | `/masters/categories` |
| GET | `/masters/lookups` | facing, furnishing, etc. |

---

## 3.5 Properties

| Method | Path | Notes |
|--------|------|-------|
| GET | `/properties` | Public search (filters below) |
| GET | `/properties/:slug` | Public detail; increments view |
| POST | `/properties` | Owner/Agent/Builder + listing limit |
| PUT | `/properties/:id` | Owner of listing or admin |
| PATCH | `/properties/:id/status` | Workflow transitions |
| DELETE | `/properties/:id` | Soft delete |
| POST | `/properties/:id/media` | Multipart |
| DELETE | `/properties/:id/media/:mediaId` | |
| PUT | `/properties/:id/amenities` | Replace set |
| GET | `/properties/mine` | Lister dashboard |
| PATCH | `/admin/properties/:id/approve` | |
| PATCH | `/admin/properties/:id/reject` | |
| PATCH | `/admin/properties/:id/verify` | |

### Search Query Params

`cityId`, `localityId`, `purpose`, `categoryId`, `propertyTypeId`, `minPrice`, `maxPrice`, `minArea`, `maxArea`, `bedrooms`, `bathrooms`, `amenities` (csv), `constructionStatus`, `builderId`, `agentId`, `ownerId`, `q`, `sort` (`price_asc|price_desc|newest|relevance`), `page`, `limit`

---

## 3.6 Projects & Inventory

| Method | Path |
|--------|------|
| GET | `/projects` |
| GET | `/projects/:slug` |
| POST | `/projects` |
| PUT | `/projects/:id` |
| DELETE | `/projects/:id` |
| CRUD | `/projects/:id/towers` |
| CRUD | `/projects/:id/units` |
| POST | `/projects/:id/media` |
| POST | `/inventory/units/:id/hold` |
| DELETE | `/inventory/units/:id/hold` |
| GET | `/builders/:id/projects` |

---

## 3.7 Wishlist, Compare, Reviews

| Method | Path |
|--------|------|
| GET/POST/DELETE | `/wishlist` · `/wishlist/:propertyId` |
| GET/POST/DELETE | `/compare` · `/compare/:propertyId` |
| GET | `/compare/details` | Hydrated compare payload |
| GET/POST | `/properties/:id/reviews` |
| PATCH | `/admin/reviews/:id/moderate` |

---

## 3.8 Leads, Inquiries, Visits, Bookings

| Method | Path |
|--------|------|
| POST | `/inquiries` | Public/Auth |
| GET | `/inquiries` | Role-scoped |
| PATCH | `/inquiries/:id` | |
| GET/POST/PATCH | `/leads` | |
| POST | `/visits` | Schedule |
| GET | `/visits` | |
| PATCH | `/visits/:id/status` | |
| POST | `/bookings` | Builder projects |
| GET/PATCH | `/bookings/:id` | |

---

## 3.9 Subscriptions & Ads

| Method | Path |
|--------|------|
| GET | `/subscription-plans` |
| GET | `/subscriptions/me` |
| POST | `/subscriptions` | Start/renew (payment stub → gateway later) |
| CRUD | `/admin/advertisements` |
| GET | `/advertisements?placement=` | Public |

---

## 3.10 CMS

| Method | Path |
|--------|------|
| GET | `/cms/pages/:slug` |
| GET | `/cms/blogs` · `/cms/blogs/:slug` |
| GET | `/cms/news` · `/cms/news/:slug` |
| GET | `/cms/banners` |
| GET | `/cms/faqs` |
| CRUD | `/cms/admin/*` | CMS_EDITOR+ |

---

## 3.11 Support

| Method | Path |
|--------|------|
| GET/POST | `/tickets` |
| GET | `/tickets/:id` |
| POST | `/tickets/:id/messages` |
| PATCH | `/tickets/:id/status` |
| GET/POST/PATCH | `/complaints` |

---

## 3.12 Chat, Notifications, Reports, Settings

| Method | Path |
|--------|------|
| GET | `/conversations` |
| POST | `/conversations` |
| GET | `/conversations/:id/messages` |
| POST | `/conversations/:id/messages` | Also via Socket.io |
| GET | `/notifications` |
| PATCH | `/notifications/:id/read` |
| PATCH | `/notifications/read-all` |
| GET | `/reports/:type` | Permission-gated aggregates |
| GET/PUT | `/settings` | Super admin |

### Socket Events

| Event | Direction | Payload |
|-------|-----------|---------|
| `chat:join` | C→S | `{ conversationId }` |
| `chat:message` | bidirectional | `{ conversationId, body }` |
| `notification:new` | S→C | notification object |
| `presence:update` | bidirectional | optional |

---

## 3.13 Uploads

| Method | Path |
|--------|------|
| POST | `/uploads` | Generic authenticated upload → returns path |
| POST | `/uploads/avatar` | |

Storage service returns `{ path, url, mimeType, size }` — URL prefix switches local ↔ CDN/S3.

Images run through **Sharp** (resize, strip metadata, optional WebP) inside the upload service before disk write.

---

## 3.14 Builder Team

| Method | Path | Notes |
|--------|------|-------|
| GET | `/builders/me/team` | List team members |
| POST | `/builders/me/team` | Invite/add |
| PUT | `/builders/me/team/:id` | Update |
| DELETE | `/builders/me/team/:id` | Soft remove |

---

## 3.15 Property Reports & Verification Requests

| Method | Path | Notes |
|--------|------|-------|
| POST | `/property-reports` | Buyer/public flag |
| GET | `/property-reports` | Support/Admin |
| PATCH | `/property-reports/:id` | Resolve/dismiss |
| POST | `/verification-requests` | Agent/Owner/Builder submit |
| GET | `/verification-requests` | Queues |
| PATCH | `/verification-requests/:id` | Approve/reject |
