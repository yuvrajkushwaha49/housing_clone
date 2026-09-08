# 6. UI / Navigation Flows

## Public Site

```
Logo | Buy | Rent | Projects | Agents | Blog | Login / Register
  → Home (search hero)
  → /search (filters)
  → /property/:slug
  → /project/:slug
  → /builders/:slug
  → /city/:slug
  → CMS pages / blog / news
```

## Post-Login Landing

| Role | Path |
|------|------|
| SUPER_ADMIN | `/panel/super-admin/dashboard` |
| ADMIN | `/panel/admin/dashboard` |
| BUILDER | `/panel/builder/dashboard` |
| AGENT | `/panel/agent/dashboard` |
| OWNER | `/panel/owner/dashboard` |
| BUYER | `/panel/buyer/dashboard` |
| SUPPORT | `/panel/support/dashboard` |
| CMS_EDITOR | `/panel/cms/dashboard` |

## Panel Shell (Desktop-first)

```
┌─────────────┬──────────────────────────────┐
│ Brand       │ Topbar: search · notifs ·    │
│ Sidebar     │ theme · profile              │
│ (role nav)  ├──────────────────────────────┤
│             │ Breadcrumb                   │
│             │ Page: cards / tables / forms │
└─────────────┴──────────────────────────────┘
```

Responsive: sidebar collapses to drawer on tablet/mobile.

---

## Sidebar Modules (Final Scope)

### 1. Super Admin
Dashboard · Users · Roles · Permissions · Properties · Projects · Builders · Agents · Owners · Buyers · Subscriptions · Advertisements · CMS · Locations · Amenities · Reports · Settings

### 2. Admin
Dashboard · Property Approval · Property Verification · User Verification · Leads · Support · Reviews · Notifications · Reports

### 3. Builder
Dashboard · Company Profile · Projects · Towers · Units · Inventory · Gallery · Floor Plans · Brochure · Leads · Site Visits · Booking Requests · Team · Reports  
*(Towers/Units/Gallery/Floor Plans/Brochure are project-scoped when a project is selected.)*

### 4. Agent
Dashboard · My Properties · Add Property · Property Status · Leads · Site Visits · Chat · Subscription · Profile Verification · Reports

### 5. Owner
Dashboard · My Properties · Add Property · Edit Property · Images · Videos · Documents · Property Analytics · Interested Buyers · Site Visits · Chat · Subscription

### 6. Buyer
Dashboard · Search Properties · Saved Properties · Compare Properties · Book Site Visit · Chat · Reviews · Loan Calculator · Profile · Notifications

### 7. Support
Dashboard · Tickets · Live Chat · Complaints · Property Reports · Verification Requests · FAQ

### 8. CMS
Dashboard · Blogs · News · City Pages · Builder Pages · Static Pages · FAQ · SEO · Banner Management

---

## Key UI Flows

### Property listing (Owner/Agent)
```
Add Property wizard → draft → submit → Admin approval → live
Media (images via Sharp) → videos → documents → SEO
```

### Property discovery (Buyer)
```
Search → filters → detail → save / compare / book visit / chat / review
```

### Builder delivery
```
Profile → Project → Towers → Units/Inventory → Media → Publish → Leads/Visits/Bookings → Team
```

### Moderation (Admin)
```
Queues → inspect → approve/reject/verify → notify actor
```
