# 10. Database Relationships

## Entity Relationship (Logical)

```
users ──┬──< user_roles >── roles ──< role_permissions >── permissions
        ├── refresh_tokens
        ├── email_verifications / password_resets / otp_challenges
        ├── builder_profiles ──< projects ──< project_towers ──< project_units
        │                              └──< project_media / project_amenities
        ├── agent_profiles
        ├── owner_profiles
        ├── buyer_profiles
        ├── properties ──┬── property_amenities >── amenities
        │                ├── property_media
        │                ├── property_nearby_places
        │                ├── property_views
        │                ├── wishlists
        │                ├── property_compares
        │                └── reviews
        ├── leads / inquiries / site_visits / booking_requests
        ├── subscriptions >── subscription_plans
        ├── support_tickets ──< support_ticket_messages
        ├── complaints
        ├── conversation_participants >── conversations ──< messages
        └── notifications

locations: countries ──< states ──< cities ──< localities
properties.city_id → cities; properties.locality_id → localities

CMS: cms_pages, blogs, news, banners, faqs (author → users)
ads: advertisements (optional city_id)
settings, audit_logs (platform)
```

## Cardinality Highlights

| Parent | Child | Type | Notes |
|--------|-------|------|-------|
| users | builder_profiles | 1:0..1 | Only for BUILDER |
| users | properties | 1:N | listed_by_user_id |
| builders | projects | 1:N | |
| builders | builder_team_members | 1:N | Builder Team module |
| users | verification_requests | 1:N | Agent/Owner/Builder KYC |
| properties | property_reports | 1:N | Support flag queue |
| projects | towers | 1:N | |
| towers | units | 1:N | unit may omit tower |
| projects | units | 1:N | direct for low-rise |
| units | properties | 0..1:0..1 | Optional public listing link |
| properties | media | 1:N | |
| properties | amenities | N:M | |
| users | wishlists | N:M properties | |
| properties | leads | 1:N | |
| inquiries | leads | 0..1:1 | Optional promotion |
| conversations | messages | 1:N | |
| users | subscriptions | 1:N | Current = latest active |

## Soft Delete Behavior

- Queries default `WHERE deleted_at IS NULL`
- Unique constraints on email/phone/slug use partial uniqueness via composite with `deleted_at` **or** archive slug on delete (`slug = slug + '__del__' + id`) — **chosen approach: append suffix on soft delete** to keep simple UNIQUE indexes

## Index Strategy

- Hot paths: property search (city + purpose + status + price), slug lookups, lead assignee, visit schedule, notification user+unread
- Fulltext on property title/description
- Composite indexes documented in `011_indexes.sql`

## Referential Integrity

- Prefer restrict on delete for masters (amenities, cities)
- Soft-delete parents; children remain for audit; UI hides via parent join
- Hard purge: Super Admin job after N days (future)
