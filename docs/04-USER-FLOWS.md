# 4. User Flows

## 4.1 Registration & Verification

```
Visitor → Register (role select: Buyer|Owner|Agent|Builder)
       → Create user (status: pending)
       → Send email verification
       → User clicks link → email_verified_at set
       → If Agent/Builder/Owner → profile completion required
       → Admin verification queue (Agent/Builder/Owner)
       → status: active → panel access granted
```

## 4.2 Login Variants

1. **Password:** email + password → JWT access (15m) + refresh (7d)
2. **OTP:** request OTP → verify → JWT pair
3. **Refresh:** valid refresh → new access (+ rotate refresh)

## 4.3 Forgot Password

```
Forgot → email → password_resets token → Reset form → hash update → revoke all refresh tokens
```

## 4.4 Buyer Journey

```
Home / Search → Filters → Results → Property Detail
  ├─ Wishlist / Compare
  ├─ Schedule Visit → site_visits (requested)
  ├─ Inquiry → inquiries + lead
  ├─ Chat with Agent/Owner
  ├─ Review (after visit/purchase eligibility rules)
  └─ Loan Calculator (client-side; no PII stored unless saved)
```

## 4.5 Owner / Agent Listing Journey

```
Panel → Add Property (draft)
     → Upload media
     → Submit for approval (pending)
     → Admin approve/reject
     → Live listing (approved)
     → Leads / Visits / Chat
     → Mark sold/rented / archive
```

Subscription check: if listing_limit exceeded → block submit with upgrade CTA.

## 4.6 Builder Project Journey

```
Company Profile → Create Project → Towers → Units/Inventory
               → Gallery / Floor Plans / Brochure
               → Team members
               → Publish (pending approval)
               → Leads / Booking Requests / Site Visits
               → Inventory hold / sold
```

## 4.7 Admin Moderation

```
Queue: Property Approval | Property Verification | User Verification | Reviews | Support
     → Inspect → Approve / Reject (reason) → Notify actor
```

## 4.8 Support Flow

```
Tickets · Live Chat · Complaints · Property Reports · Verification Requests · FAQ
```

## 4.9 Super Admin Ops

```
Users · Roles · Permissions → Masters (locations, amenities)
→ Properties/Projects directories → Subscriptions & Ads → CMS → Reports → Settings
```

## 4.10 Agent Profile Verification

```
Agent submits documents → verification_requests → Admin/Support review → agent_profiles.verification_status
```
