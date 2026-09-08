import * as leadService from '../services/lead.service.js';
import * as notificationHelper from '../helpers/notification.helper.js';
import ApiResponse from '../utils/ApiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';

export const createInquiry = asyncHandler(async (req, res) => {
  const data = await leadService.createInquiry(req.body, req.user || null, req);
  return ApiResponse.created(res, data, data.message);
});

export const createSellerContact = asyncHandler(async (req, res) => {
  const data = await leadService.createSellerContact(req.body, req.user || null, req);
  return ApiResponse.created(res, data, data.message);
});

export const listInquiries = asyncHandler(async (req, res) => {
  const result = await leadService.listInquiries(req.user, req.query);
  return ApiResponse.success(res, result.items, 'Inquiries fetched', 200, result.meta);
});

export const updateInquiryStatus = asyncHandler(async (req, res) => {
  const data = await leadService.updateInquiryStatus(
    req.params.uuid,
    req.body.status,
    req.user,
    req
  );
  return ApiResponse.success(res, data, 'Inquiry updated');
});

export const listLeads = asyncHandler(async (req, res) => {
  const result = await leadService.listLeads(req.user, req.query);
  return ApiResponse.success(res, result.items, 'Leads fetched', 200, result.meta);
});

export const updateLead = asyncHandler(async (req, res) => {
  const data = await leadService.updateLead(req.params.uuid, req.body, req.user, req);
  return ApiResponse.success(res, data, 'Lead updated');
});

export const createVisit = asyncHandler(async (req, res) => {
  const data = await leadService.createSiteVisit(req.body, req.user || null, req);
  return ApiResponse.created(res, data, data.message);
});

export const listVisits = asyncHandler(async (req, res) => {
  const result = await leadService.listSiteVisits(req.user, req.query);
  return ApiResponse.success(res, result.items, 'Visits fetched', 200, result.meta);
});

export const updateVisitStatus = asyncHandler(async (req, res) => {
  const data = await leadService.updateSiteVisitStatus(
    req.params.uuid,
    req.body,
    req.user,
    req
  );
  return ApiResponse.success(res, data, 'Visit updated');
});

export const approvalStats = asyncHandler(async (_req, res) => {
  const data = await leadService.getApprovalQueueStats();
  return ApiResponse.success(res, data);
});

export const listNotifications = asyncHandler(async (req, res) => {
  const result = await notificationHelper.listNotifications(req.user.id, {
    page: Number(req.query.page || 1),
    limit: Number(req.query.limit || 20),
    unreadOnly: req.query.unreadOnly === 'true',
  });
  return ApiResponse.success(res, result.items, 'Notifications', 200, result.meta);
});

export const markNotificationRead = asyncHandler(async (req, res) => {
  await notificationHelper.markNotificationRead(req.user.id, req.params.uuid);
  return ApiResponse.success(res, null, 'Marked as read');
});

export const markAllNotificationsRead = asyncHandler(async (req, res) => {
  await notificationHelper.markAllNotificationsRead(req.user.id);
  return ApiResponse.success(res, null, 'Notifications cleared');
});

export const acknowledgeNotifications = asyncHandler(async (req, res) => {
  const ids = Array.isArray(req.body?.ids) ? req.body.ids : [];
  const data = await notificationHelper.acknowledgeDelivered(req.user.id, ids);
  return ApiResponse.success(res, data, 'Notifications acknowledged');
});

export const unreadNotificationCount = asyncHandler(async (req, res) => {
  const total = await notificationHelper.unreadCount(req.user.id);
  return ApiResponse.success(res, { total });
});
