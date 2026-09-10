import api from './api';

export const authService = {
  register: (payload) => api.post('/auth/register', payload),
  login: (payload) => api.post('/auth/login', payload),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
  refresh: () => api.post('/auth/refresh'),
  verifyEmail: (token) => api.post('/auth/verify-email', { token }),
  resendVerification: (email) => api.post('/auth/resend-verification', { email }),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (payload) => api.post('/auth/reset-password', payload),
  changePassword: (payload) => api.post('/auth/change-password', payload),
  requestOtp: (email) => api.post('/auth/otp/request', { email }),
  verifyOtp: (payload) => api.post('/auth/otp/verify', payload),
};

export const rbacService = {
  listRoles: () => api.get('/rbac/roles'),
  listPermissions: () => api.get('/rbac/permissions'),
  getRolePermissions: (uuid) => api.get(`/rbac/roles/${uuid}/permissions`),
  setRolePermissions: (uuid, permissions) =>
    api.put(`/rbac/roles/${uuid}/permissions`, { permissions }),
  createRole: (payload) => api.post('/rbac/roles', payload),
  listUsers: (params) => api.get('/rbac/users', { params }),
  getUser: (uuid) => api.get(`/rbac/users/${uuid}`),
  updateUser: (uuid, payload) => api.patch(`/rbac/users/${uuid}`, payload),
  updateUserStatus: (uuid, status) => api.patch(`/rbac/users/${uuid}/status`, { status }),
  resetUserPassword: (uuid, password) => api.patch(`/rbac/users/${uuid}/password`, { password }),
};

export const dashboardService = {
  getStats: () => api.get('/dashboard'),
};

export const leadService = {
  createInquiry: (payload) => api.post('/inquiries', payload),
  createContact: (payload) => api.post('/leads/contact', payload),
  listInquiries: (params) => api.get('/inquiries', { params }),
  updateInquiryStatus: (uuid, status) => api.patch(`/inquiries/${uuid}/status`, { status }),
  listLeads: (params) => api.get('/leads', { params }),
  updateLead: (uuid, payload) => api.patch(`/leads/${uuid}`, payload),
  createVisit: (payload) => api.post('/visits', payload),
  listVisits: (params) => api.get('/visits', { params }),
  updateVisitStatus: (uuid, payload) => api.patch(`/visits/${uuid}/status`, payload),
  approvalStats: () => api.get('/admin/approval-stats'),
  listNotifications: (params) => api.get('/notifications', { params }),
  unreadCount: () => api.get('/notifications/unread-count'),
  ackNotifications: (ids) => api.post('/notifications/ack', { ids }),
  markRead: (uuid) => api.patch(`/notifications/${uuid}/read`),
  markAllRead: () => api.patch('/notifications/read-all'),
};

export const chatService = {
  listConversations: () => api.get('/conversations'),
  start: (payload) => api.post('/conversations', payload),
  get: (uuid) => api.get(`/conversations/${uuid}`),
  listMessages: (uuid, params) => api.get(`/conversations/${uuid}/messages`, { params }),
  sendMessage: (uuid, body) => api.post(`/conversations/${uuid}/messages`, { body }),
};

export const reviewService = {
  create: (payload) => api.post('/reviews', payload),
  mine: () => api.get('/reviews/mine'),
  pending: (params) => api.get('/reviews/pending', { params }),
  moderate: (uuid, payload) => api.patch(`/reviews/${uuid}/moderate`, payload),
  forProperty: (propertyUuid) => api.get(`/properties/${propertyUuid}/reviews`),
};

export const supportService = {
  createTicket: (payload) => api.post('/tickets', payload),
  listTickets: (params) => api.get('/tickets', { params }),
  getTicket: (uuid) => api.get(`/tickets/${uuid}`),
  addMessage: (uuid, payload) => api.post(`/tickets/${uuid}/messages`, payload),
  updateTicket: (uuid, payload) => api.patch(`/tickets/${uuid}`, payload),
  listFaqs: (params) => api.get('/faqs', { params }),
  createFaq: (payload) => api.post('/faqs', payload),
  createComplaint: (payload) => api.post('/complaints', payload),
  listComplaints: (params) => api.get('/complaints', { params }),
};

export const subscriptionService = {
  listPlans: (params) => api.get('/subscription-plans', { params }),
  me: () => api.get('/subscriptions/me'),
  start: (planId) => api.post('/subscriptions', { planId }),
  adminList: (params) => api.get('/admin/subscriptions', { params }),
  adminCreatePlan: (payload) => api.post('/admin/subscription-plans', payload),
  adminUpdatePlan: (uuid, payload) => api.put(`/admin/subscription-plans/${uuid}`, payload),
  adminUserEntitlements: (userUuid) => api.get(`/admin/users/${userUuid}/entitlements`),
  adminSetUserEntitlements: (userUuid, payload) =>
    api.patch(`/admin/users/${userUuid}/entitlements`, payload),
  adminGrantSubscription: (userUuid, payload) =>
    api.post(`/admin/users/${userUuid}/subscriptions`, payload),
};

export const advertisementService = {
  list: (params) => api.get('/advertisements', { params }),
  adminList: () => api.get('/admin/advertisements'),
  create: (formData) => api.post('/admin/advertisements', formData),
  update: (uuid, formData) => api.put(`/admin/advertisements/${uuid}`, formData),
  remove: (uuid) => api.delete(`/admin/advertisements/${uuid}`),
};

export const cmsService = {
  listPages: (params) => api.get('/cms/pages', { params }),
  getPage: (slug) => api.get(`/cms/pages/${slug}`),
  listBlogs: (params) => api.get('/cms/blogs', { params }),
  getBlog: (slug) => api.get(`/cms/blogs/${slug}`),
  listNews: (params) => api.get('/cms/news', { params }),
  getNews: (slug) => api.get(`/cms/news/${slug}`),
  listBanners: (params) => api.get('/cms/banners', { params }),
  adminListPages: (params) => api.get('/cms/admin/pages', { params }),
  adminSavePage: (payload, uuid) =>
    uuid ? api.put(`/cms/admin/pages/${uuid}`, payload) : api.post('/cms/admin/pages', payload),
  adminListBlogs: () => api.get('/cms/admin/blogs'),
  adminSaveBlog: (payload, uuid) =>
    uuid ? api.put(`/cms/admin/blogs/${uuid}`, payload) : api.post('/cms/admin/blogs', payload),
  adminDeleteBlog: (uuid) => api.delete(`/cms/admin/blogs/${uuid}`),
  adminListNews: () => api.get('/cms/admin/news'),
  adminSaveNews: (payload, uuid) =>
    uuid ? api.put(`/cms/admin/news/${uuid}`, payload) : api.post('/cms/admin/news', payload),
  adminDeleteNews: (uuid) => api.delete(`/cms/admin/news/${uuid}`),
  adminListBanners: () => api.get('/cms/admin/banners'),
  adminSaveBanner: (payload, uuid) =>
    uuid ? api.put(`/cms/admin/banners/${uuid}`, payload) : api.post('/cms/admin/banners', payload),
};

export const reportService = {
  overview: () => api.get('/reports'),
  createPropertyReport: (payload) => api.post('/property-reports', payload),
  listPropertyReports: (params) => api.get('/property-reports', { params }),
  updatePropertyReport: (uuid, payload) => api.patch(`/property-reports/${uuid}`, payload),
};

export const projectService = {
  list: (params) => api.get('/projects', { params }),
  mine: (params) => api.get('/projects/mine', { params }),
  mineStats: () => api.get('/projects/mine/stats'),
  adminList: (params) => api.get('/projects/admin', { params }),
  getBySlug: (slug) => api.get(`/projects/slug/${slug}`),
  get: (uuid) => api.get(`/projects/${uuid}`),
  create: (payload) => api.post('/projects', payload),
  update: (uuid, payload) => api.put(`/projects/${uuid}`, payload),
  updateStatus: (uuid, payload) => api.patch(`/projects/${uuid}/status`, payload),
  getReview: (uuid) => api.get(`/projects/${uuid}/review`),
  completeReview: (uuid, payload) => api.post(`/projects/${uuid}/review/complete`, payload),
  remove: (uuid) => api.delete(`/projects/${uuid}`),
  addBuilding: (uuid, payload) => api.post(`/projects/${uuid}/buildings`, payload),
  updateBuilding: (uuid, buildingUuid, payload) =>
    api.patch(`/projects/${uuid}/buildings/${buildingUuid}`, payload),
  deleteBuilding: (uuid, buildingUuid) => api.delete(`/projects/${uuid}/buildings/${buildingUuid}`),
  addTower: (uuid, payload) => api.post(`/projects/${uuid}/towers`, payload),
  updateTower: (uuid, towerUuid, payload) =>
    api.patch(`/projects/${uuid}/towers/${towerUuid}`, payload),
  deleteTower: (uuid, towerUuid) => api.delete(`/projects/${uuid}/towers/${towerUuid}`),
  addUnit: (uuid, payload) => api.post(`/projects/${uuid}/units`, payload),
  updateUnitStatus: (uuid, unitUuid, status) =>
    api.patch(`/projects/${uuid}/units/${unitUuid}/status`, { status }),
  uploadMedia: (uuid, formData) => api.post(`/projects/${uuid}/media`, formData),
  updateMedia: (uuid, mediaUuid, payload) =>
    api.patch(`/projects/${uuid}/media/${mediaUuid}`, payload),
  uploadAmenityImage: (uuid, amenityUuid, formData) =>
    api.post(`/projects/${uuid}/amenities/${amenityUuid}/image`, formData),
  deleteMedia: (uuid, mediaUuid) => api.delete(`/projects/${uuid}/media/${mediaUuid}`),
  holdUnit: (unitUuid, hours = 24) => api.post(`/inventory/units/${unitUuid}/hold`, { hours }),
  releaseHold: (unitUuid) => api.delete(`/inventory/units/${unitUuid}/hold`),
  wishlist: (params) => api.get('/projects/wishlist', { params }),
  toggleWishlist: (uuid) => api.post(`/projects/${uuid}/wishlist`),
};

export const builderService = {
  me: () => api.get('/builders/me/profile'),
  updateMe: (payload) => api.put('/builders/me/profile', payload),
  get: (uuid) => api.get(`/builders/${uuid}`),
  list: (params) => api.get('/builders', { params }),
  listTeam: () => api.get('/builders/me/team'),
  addTeam: (payload) => api.post('/builders/me/team', payload),
  removeTeam: (uuid) => api.delete(`/builders/me/team/${uuid}`),
  listProfileChanges: (params) => api.get('/admin/builder-profile-changes', { params }),
  reviewProfileChange: (uuid, payload) => api.patch(`/admin/builder-profile-changes/${uuid}`, payload),
};

export const bookingService = {
  create: (payload) => api.post('/bookings', payload),
  list: (params) => api.get('/bookings', { params }),
  get: (uuid) => api.get(`/bookings/${uuid}`),
  update: (uuid, payload) => api.patch(`/bookings/${uuid}`, payload),
};

export const profileService = {
  me: () => api.get('/profiles/me'),
  updateMe: (payload) => api.put('/profiles/me', payload),
  recommendedSellers: (params) => api.get('/sellers/recommended', { params }),
  submitVerification: (payload) => api.post('/verification-requests', payload),
  myVerifications: () => api.get('/verification-requests/mine'),
  listVerifications: (params) => api.get('/verification-requests', { params }),
  reviewVerification: (uuid, payload) => api.patch(`/verification-requests/${uuid}`, payload),
};

export const settingsService = {
  public: () => api.get('/settings/public'),
  list: (params) => api.get('/settings', { params }),
  upsert: (settings) => api.put('/settings', { settings }),
};

export const mastersService = {
  listCountries: (params) => api.get('/masters/countries', { params }),
  createCountry: (payload) => api.post('/masters/countries', payload),
  updateCountry: (uuid, payload) => api.put(`/masters/countries/${uuid}`, payload),
  deleteCountry: (uuid) => api.delete(`/masters/countries/${uuid}`),
  listStates: (countryUuid, params) =>
    api.get(`/masters/countries/${countryUuid}/states`, { params }),
  createState: (payload) => api.post('/masters/states', payload),
  deleteState: (uuid) => api.delete(`/masters/states/${uuid}`),
  listAllCities: (params) => api.get('/masters/cities', { params }),
  listCities: (stateUuid, params) =>
    api.get(`/masters/states/${stateUuid}/cities`, { params }),
  createCity: (payload) => api.post('/masters/cities', payload),
  deleteCity: (uuid) => api.delete(`/masters/cities/${uuid}`),
  listLocalities: (cityUuid, params) =>
    api.get(`/masters/cities/${cityUuid}/localities`, { params }),
  createLocality: (payload) => api.post('/masters/localities', payload),
  deleteLocality: (uuid) => api.delete(`/masters/localities/${uuid}`),
  listAmenities: (params) => api.get('/masters/amenities', { params }),
  createAmenity: (payload) => api.post('/masters/amenities', payload),
  updateAmenity: (uuid, payload) => api.put(`/masters/amenities/${uuid}`, payload),
  deleteAmenity: (uuid) => api.delete(`/masters/amenities/${uuid}`),
  listCategories: (params) => api.get('/masters/categories', { params }),
  createCategory: (payload) => api.post('/masters/categories', payload),
  updateCategory: (uuid, payload) => api.put(`/masters/categories/${uuid}`, payload),
  listTypes: (params) => api.get('/masters/property-types', { params }),
  createType: (payload) => api.post('/masters/property-types', payload),
  updateType: (uuid, payload) => api.put(`/masters/property-types/${uuid}`, payload),
  getLookups: () => api.get('/masters/lookups'),
};

export const propertyService = {
  search: (params) => api.get('/properties', { params }),
  getBySlug: (slug) => api.get(`/properties/slug/${slug}`),
  getById: (uuid) => api.get(`/properties/${uuid}`),
  mine: (params) => api.get('/properties/mine', { params }),
  mineStats: () => api.get('/properties/mine/stats'),
  adminList: (params) => api.get('/properties/admin', { params }),
  create: (payload) => api.post('/properties', payload),
  update: (uuid, payload) => api.put(`/properties/${uuid}`, payload),
  updateStatus: (uuid, payload) => api.patch(`/properties/${uuid}/status`, payload),
  getReview: (uuid) => api.get(`/properties/${uuid}/review`),
  completeReview: (uuid, payload) => api.post(`/properties/${uuid}/review/complete`, payload),
  remove: (uuid) => api.delete(`/properties/${uuid}`),
  uploadMedia: (uuid, formData) => api.post(`/properties/${uuid}/media`, formData),
  deleteMedia: (uuid, mediaUuid) => api.delete(`/properties/${uuid}/media/${mediaUuid}`),
  wishlist: (params) => api.get('/properties/wishlist', { params }),
  toggleWishlist: (uuid) => api.post(`/properties/${uuid}/wishlist`),
  compareList: () => api.get('/properties/compare'),
  toggleCompare: (uuid) => api.post(`/properties/${uuid}/compare`),
  removeCompare: (uuid) => api.delete(`/properties/${uuid}/compare`),
  clearCompare: () => api.delete('/properties/compare'),
};

export function mediaUrl(path) {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  const apiBase = import.meta.env.VITE_API_URL || '/api/v1';
  const origin = apiBase.replace(/\/api\/v1\/?$/, '') || '';
  return `${origin}${path.startsWith('/') ? path : `/${path}`}`;
}
