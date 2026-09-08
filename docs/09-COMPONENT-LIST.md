# 9. Component List

## 9.1 Layout
- `AppShell`, `PublicLayout`, `PanelLayout`, `Sidebar`, `Topbar`, `Footer`, `Breadcrumbs`, `PageHeader`

## 9.2 UI Primitives
- `Button`, `IconButton`, `Input`, `Textarea`, `Select`, `MultiSelect`, `Checkbox`, `Radio`, `Switch`
- `Modal`, `Drawer`, `Dropdown`, `Tabs`, `Accordion`
- `Table`, `DataTable` (sort/filter/page), `Pagination`
- `Badge`, `Alert`, `Toast` (via container), `Spinner`, `Skeleton`
- `EmptyState`, `ConfirmDialog`, `Tooltip`, `ProgressBar`
- `ThemeToggle`, `Avatar`, `Card` (interaction containers only — forms, tables, chat)

## 9.3 Forms
- `FormProvider` wrappers with React Hook Form
- `FormField`, `PasswordField`, `PhoneField`, `CurrencyField`, `AreaField`
- `DateTimePicker`, `RangeSlider` (price/area)
- `SearchFilters`, `AdvancedFilterPanel`
- `PropertyFormWizard` (steps: basics → specs → location → amenities → media → SEO → review)
- `ProjectForm`, `ProfileForm`, `TicketForm`, `InquiryForm`, `VisitSchedulerForm`

## 9.4 Property Domain
- `PropertyCard`, `PropertyGrid`, `PropertyListItem`, `PropertyStatusBadge`
- `AmenityChips`, `NearbyPlacesList`, `SpecsGrid`
- `PropertyGallery`, `VideoPlayerEmbed`, `FloorPlanViewer`, `BrochureDownload`
- `MapPicker`, `MapView` (Google Maps)
- `CompareBar`, `CompareTable`
- `WishlistButton`, `ShareButton`, `ViewCounter` (display)
- `LoanCalculator`

## 9.5 Project / Inventory
- `ProjectCard`, `TowerList`, `UnitTable`, `InventoryStatusChip`, `HoldUnitModal`

## 9.6 Chat & Notifications
- `ChatWindow`, `ConversationList`, `MessageList`, `MessageInput`, `TypingIndicator`
- `NotificationBell`, `NotificationDropdown`, `NotificationItem`

## 9.7 Charts & Reports
- `ChartCard` (Chart.js), `KpiStat`, `LeadFunnelChart`, `ListingsByCityChart`, `ViewsTrendChart`

## 9.8 Media
- `FileUploader`, `MultiImageUploader`, `DocumentUploader`, `MediaSortableGrid`

## 9.9 Guards & Auth UI
- `AuthGuard`, `RoleGuard`, `PermissionGuard`, `GuestGuard`
- `LoginForm`, `RegisterForm`, `OtpForm`, `ForgotPasswordForm`

## 9.10 CMS
- `RichTextEditor` (controlled), `SeoFields`, `BannerPreview`, `SlugInput`

## 9.11 Panel-Specific Composites
- `ApprovalQueueTable`, `VerificationCard`, `LeadKanban` (or table + status), `TicketThread`
- `SubscriptionPlanCards`, `RolesPermissionMatrix`

## Context Providers
- `AuthProvider` — user, tokens lifecycle, permissions helpers
- `ThemeProvider` — light/dark class on `document.documentElement`
- `CompareProvider` — up to 4 property IDs

## Design Tokens (Bootstrap 5 + custom SCSS)
- CSS variables for light/dark: `--hs-bg`, `--hs-surface`, `--hs-text`, `--hs-accent`, `--hs-border`
- Avoid purple-default AI look; brand direction locked at kickoff (recommend deep teal + warm charcoal + crisp white)
- Expressive fonts via Google Fonts — finalized in Module 3 UI shell
