export const APP_NAME = import.meta.env.VITE_APP_NAME || 'Workians';
export const BRAND_INITIAL = APP_NAME.charAt(0).toUpperCase();
export const API_URL = import.meta.env.VITE_API_URL || '/api/v1';

export const ROLE_CODES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN: 'ADMIN',
  BUILDER: 'BUILDER',
  AGENT: 'AGENT',
  OWNER: 'OWNER',
  BUYER: 'BUYER',
  SUPPORT: 'SUPPORT',
  CMS_MANAGER: 'CMS_MANAGER',
};

export const PANEL_HOME = {
  SUPER_ADMIN: '/panel/super-admin/dashboard',
  ADMIN: '/panel/admin/dashboard',
  BUILDER: '/panel/builder/dashboard',
  AGENT: '/panel/agent/dashboard',
  OWNER: '/panel/owner/dashboard',
  BUYER: '/panel/buyer/dashboard',
  SUPPORT: '/panel/support/dashboard',
  CMS_MANAGER: '/panel/cms/dashboard',
};

/** Panel roles that use header profile menu instead of the left sidebar. */
export const PANELS_WITHOUT_SIDEBAR = [ROLE_CODES.BUYER];

/** Must be activated by super admin before panel access. */
export const ACCOUNT_APPROVAL_ROLES = [
  ROLE_CODES.BUILDER,
  ROLE_CODES.AGENT,
  ROLE_CODES.OWNER,
  ROLE_CODES.CMS_MANAGER,
];

export const PUBLIC_HEADER_NAV = [
  { label: 'For Buyers', to: '/search?purpose=sale' },
  { label: 'For Tenants', to: '/search?purpose=rent' },
  { label: 'For Sellers', to: '/register?role=OWNER' },
  { label: 'Services', to: '/projects' },
  { label: 'News & Guide', to: '/blog' },
];

export const BUYER_HEADER_NAV_GROUPS = [
  {
    label: 'Browse',
    items: [
      { label: 'Dashboard', path: '/panel/buyer/dashboard' },
      { label: 'Search', path: '/panel/buyer/search' },
      { label: 'Saved', path: '/panel/buyer/saved' },
      { label: 'Compare', path: '/panel/buyer/compare' },
    ],
  },
  {
    label: 'My account',
    items: [
      { label: 'Profile', path: '/panel/buyer/profile' },
      { label: 'My Reviews', path: '/panel/buyer/reviews' },
      { label: 'Bookings', path: '/panel/buyer/bookings' },
      { label: 'Leads', path: '/panel/buyer/leads' },
    ],
  },
  {
    label: 'Support',
    items: [
      { label: 'Chat', path: '/panel/buyer/chat' },
      { label: 'Tickets', path: '/panel/buyer/tickets' },
      { label: 'FAQ', path: '/panel/buyer/faq' },
      { label: 'Complaints', path: '/panel/buyer/complaints' },
    ],
  },
  {
    label: 'Tools',
    items: [
      { label: 'Loan calculator', path: '/panel/buyer/loan-calculator' },
    ],
  },
];

export const REGISTERABLE_ROLES = [
  { value: 'BUYER', label: 'Buyer' },
  { value: 'OWNER', label: 'Owner' },
  { value: 'AGENT', label: 'Agent' },
  { value: 'BUILDER', label: 'Builder' },
];

const engagementNav = (base) => [
  { label: 'Chat', path: `${base}/chat`, icon: 'bi-chat-dots' },
  { label: 'Tickets', path: `${base}/tickets`, icon: 'bi-ticket-perforated' },
  { label: 'FAQ', path: `${base}/faq`, icon: 'bi-question-circle' },
];

export const NAV_BY_ROLE = {
  SUPER_ADMIN: [
    { label: 'Dashboard', path: '/panel/super-admin/dashboard', icon: 'bi-speedometer2' },
    { label: 'Users', path: '/panel/super-admin/users', icon: 'bi-people' },
    { label: 'Roles', path: '/panel/super-admin/roles', icon: 'bi-shield-lock' },
    { label: 'Permissions', path: '/panel/super-admin/permissions', icon: 'bi-key' },
    { label: 'Locations', path: '/panel/super-admin/locations', icon: 'bi-geo-alt' },
    { label: 'Amenities', path: '/panel/super-admin/amenities', icon: 'bi-stars' },
    { label: 'Categories', path: '/panel/super-admin/categories', icon: 'bi-tags' },
    { label: 'Properties', path: '/panel/super-admin/properties', icon: 'bi-houses' },
    { label: 'Approvals', path: '/panel/super-admin/approvals', icon: 'bi-check2-square' },
    { label: 'Projects', path: '/panel/super-admin/projects', icon: 'bi-buildings' },
    { label: 'Bookings', path: '/panel/super-admin/bookings', icon: 'bi-journal-check' },
    // { label: 'Builder team', path: '/panel/super-admin/team', icon: 'bi-people' },
    { label: 'Verifications', path: '/panel/super-admin/verifications', icon: 'bi-person-check' },
    { label: 'Profile reviews', path: '/panel/super-admin/builder-profiles', icon: 'bi-building-check' },
    { label: 'Leads', path: '/panel/super-admin/leads', icon: 'bi-funnel' },
    { label: 'Inquiries', path: '/panel/super-admin/inquiries', icon: 'bi-chat-left-text' },
    { label: 'Visits', path: '/panel/super-admin/visits', icon: 'bi-calendar-check' },
    { label: 'Reviews', path: '/panel/super-admin/reviews', icon: 'bi-star' },
    { label: 'Subscriptions', path: '/panel/super-admin/subscriptions', icon: 'bi-credit-card' },
    { label: 'Advertisements', path: '/panel/super-admin/advertisements', icon: 'bi-badge-ad' },
    { label: 'CMS', path: '/panel/super-admin/cms', icon: 'bi-newspaper' },
    { label: 'Reports', path: '/panel/super-admin/reports', icon: 'bi-graph-up' },
    { label: 'App settings', path: '/panel/super-admin/app-settings', icon: 'bi-gear' },
    ...engagementNav('/panel/super-admin'),
    { label: 'Complaints', path: '/panel/super-admin/complaints', icon: 'bi-exclamation-triangle' },
    { label: 'Property reports', path: '/panel/super-admin/property-reports', icon: 'bi-flag' },
    { label: '— Buyer tools —', path: '/panel/buyer/search', icon: 'bi-search' },
    { label: 'Saved', path: '/panel/buyer/saved', icon: 'bi-heart' },
    { label: 'Compare', path: '/panel/buyer/compare', icon: 'bi-layout-three-columns' },
    { label: 'Loan calculator', path: '/panel/buyer/loan-calculator', icon: 'bi-calculator' },
    { label: 'Support panel', path: '/panel/support/dashboard', icon: 'bi-headset' },
    { label: 'CMS panel', path: '/panel/cms/dashboard', icon: 'bi-newspaper' },
  ],
  ADMIN: [
    { label: 'Dashboard', path: '/panel/admin/dashboard', icon: 'bi-speedometer2' },
    { label: 'Approvals', path: '/panel/admin/approvals', icon: 'bi-check2-square' },
    { label: 'Properties', path: '/panel/admin/properties', icon: 'bi-houses' },
    { label: 'Projects', path: '/panel/admin/projects', icon: 'bi-buildings' },
    { label: 'Verifications', path: '/panel/admin/verifications', icon: 'bi-person-check' },
    { label: 'Leads', path: '/panel/admin/leads', icon: 'bi-funnel' },
    { label: 'Inquiries', path: '/panel/admin/inquiries', icon: 'bi-chat-left-text' },
    { label: 'Visits', path: '/panel/admin/visits', icon: 'bi-calendar-check' },
    { label: 'Reviews', path: '/panel/admin/reviews', icon: 'bi-star' },
    { label: 'Subscriptions', path: '/panel/admin/subscriptions', icon: 'bi-credit-card' },
    { label: 'Advertisements', path: '/panel/admin/advertisements', icon: 'bi-badge-ad' },
    { label: 'CMS', path: '/panel/admin/cms', icon: 'bi-newspaper' },
    { label: 'Reports', path: '/panel/admin/reports', icon: 'bi-graph-up' },
    { label: 'App settings', path: '/panel/admin/app-settings', icon: 'bi-gear' },
    ...engagementNav('/panel/admin'),
    { label: 'Complaints', path: '/panel/admin/complaints', icon: 'bi-exclamation-triangle' },
    { label: 'Property reports', path: '/panel/admin/property-reports', icon: 'bi-flag' },
  ],
  BUILDER: [
    { label: 'Dashboard', path: '/panel/builder/dashboard', icon: 'bi-speedometer2' },
    { label: 'Profile', path: '/panel/builder/profile', icon: 'bi-building' },
    { label: 'Projects', path: '/panel/builder/projects', icon: 'bi-buildings' },
    { label: 'Plots', path: '/panel/builder/plots', icon: 'bi-map' },
    { label: 'Bookings', path: '/panel/builder/bookings', icon: 'bi-journal-check' },
    // { label: 'Team', path: '/panel/builder/team', icon: 'bi-people' },
    { label: 'Properties', path: '/panel/builder/properties', icon: 'bi-houses' },
    { label: 'Leads', path: '/panel/builder/leads', icon: 'bi-funnel' },
    { label: 'Inquiries', path: '/panel/builder/inquiries', icon: 'bi-chat-left-text' },
    { label: 'Visits', path: '/panel/builder/visits', icon: 'bi-calendar-check' },
    { label: 'Subscription', path: '/panel/builder/subscription', icon: 'bi-credit-card' },
    { label: 'Reports', path: '/panel/builder/reports', icon: 'bi-graph-up' },
    ...engagementNav('/panel/builder'),
  ],
  AGENT: [
    { label: 'Dashboard', path: '/panel/agent/dashboard', icon: 'bi-speedometer2' },
    { label: 'Profile', path: '/panel/agent/profile', icon: 'bi-person-badge' },
    { label: 'Properties', path: '/panel/agent/properties', icon: 'bi-houses' },
    { label: 'Leads', path: '/panel/agent/leads', icon: 'bi-funnel' },
    { label: 'Inquiries', path: '/panel/agent/inquiries', icon: 'bi-chat-left-text' },
    { label: 'Visits', path: '/panel/agent/visits', icon: 'bi-calendar-check' },
    { label: 'Subscription', path: '/panel/agent/subscription', icon: 'bi-credit-card' },
    { label: 'Reports', path: '/panel/agent/reports', icon: 'bi-graph-up' },
    ...engagementNav('/panel/agent'),
  ],
  OWNER: [
    { label: 'Dashboard', path: '/panel/owner/dashboard', icon: 'bi-speedometer2' },
    { label: 'Profile', path: '/panel/owner/profile', icon: 'bi-person-badge' },
    { label: 'Properties', path: '/panel/owner/properties', icon: 'bi-houses' },
    { label: 'Leads', path: '/panel/owner/leads', icon: 'bi-funnel' },
    { label: 'Inquiries', path: '/panel/owner/inquiries', icon: 'bi-chat-left-text' },
    { label: 'Visits', path: '/panel/owner/visits', icon: 'bi-calendar-check' },
    { label: 'Subscription', path: '/panel/owner/subscription', icon: 'bi-credit-card' },
    { label: 'Reports', path: '/panel/owner/reports', icon: 'bi-graph-up' },
    ...engagementNav('/panel/owner'),
  ],
  BUYER: [
    { label: 'Dashboard', path: '/panel/buyer/dashboard', icon: 'bi-speedometer2' },
    { label: 'Profile', path: '/panel/buyer/profile', icon: 'bi-person' },
    { label: 'Search', path: '/panel/buyer/search', icon: 'bi-search' },
    { label: 'Saved', path: '/panel/buyer/saved', icon: 'bi-heart' },
    { label: 'Compare', path: '/panel/buyer/compare', icon: 'bi-layout-three-columns' },
    // { label: 'My Visits', path: '/panel/buyer/visits', icon: 'bi-calendar-check' },
    { label: 'My Reviews', path: '/panel/buyer/reviews', icon: 'bi-star' },
    { label: 'Bookings', path: '/panel/buyer/bookings', icon: 'bi-journal-check' },
    { label: 'Leads', path: '/panel/buyer/leads', icon: 'bi-funnel' },
    { label: 'Loan calculator', path: '/panel/buyer/loan-calculator', icon: 'bi-calculator' },
    // { label: 'Reports', path: '/panel/buyer/reports', icon: 'bi-graph-up' },
    ...engagementNav('/panel/buyer'),
    { label: 'Complaints', path: '/panel/buyer/complaints', icon: 'bi-exclamation-triangle' },
  ],
  SUPPORT: [
    { label: 'Dashboard', path: '/panel/support/dashboard', icon: 'bi-speedometer2' },
    { label: 'Tickets', path: '/panel/support/tickets', icon: 'bi-ticket-perforated' },
    { label: 'Verifications', path: '/panel/support/verifications', icon: 'bi-person-check' },
    { label: 'Chat', path: '/panel/support/chat', icon: 'bi-chat-dots' },
    { label: 'FAQ', path: '/panel/support/faq', icon: 'bi-question-circle' },
    { label: 'Complaints', path: '/panel/support/complaints', icon: 'bi-exclamation-triangle' },
    { label: 'Property reports', path: '/panel/support/property-reports', icon: 'bi-flag' },
    { label: 'Reports', path: '/panel/support/reports', icon: 'bi-graph-up' },
  ],
  CMS_MANAGER: [
    { label: 'Dashboard', path: '/panel/cms/dashboard', icon: 'bi-speedometer2' },
    { label: 'CMS', path: '/panel/cms/content', icon: 'bi-newspaper' },
    { label: 'FAQ', path: '/panel/cms/faq', icon: 'bi-question-circle' },
  ],
};
