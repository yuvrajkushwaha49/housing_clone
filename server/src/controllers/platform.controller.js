import * as subscriptionService from '../services/subscription.service.js';
import * as advertisementService from '../services/advertisement.service.js';
import * as cmsService from '../services/cms.service.js';
import * as reportService from '../services/report.service.js';
import ApiResponse from '../utils/ApiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';

// Subscriptions
export const listPlans = asyncHandler(async (req, res) => {
  const data = await subscriptionService.listPlans({
    roleScope: req.query.roleScope,
    activeOnly: req.query.activeOnly !== 'false',
  });
  return ApiResponse.success(res, data);
});

export const mySubscription = asyncHandler(async (req, res) => {
  const entitlements = await subscriptionService.getEntitlements(req.user);
  return ApiResponse.success(res, entitlements);
});

export const startSubscription = asyncHandler(async (req, res) => {
  const data = await subscriptionService.startSubscription(req.body, req.user, req);
  return ApiResponse.created(res, data, 'Subscription activated');
});

export const adminListSubscriptions = asyncHandler(async (req, res) => {
  const result = await subscriptionService.adminListSubscriptions({
    page: Number(req.query.page || 1),
    limit: Number(req.query.limit || 20),
    status: req.query.status,
  });
  return ApiResponse.success(res, result.items, 'Subscriptions', 200, result.meta);
});

export const adminCreatePlan = asyncHandler(async (req, res) => {
  const data = await subscriptionService.adminUpsertPlan(req.body, req.user, req);
  return ApiResponse.created(res, data, 'Plan created');
});

export const adminUpdatePlan = asyncHandler(async (req, res) => {
  const data = await subscriptionService.adminUpsertPlan(req.body, req.user, req, req.params.uuid);
  return ApiResponse.success(res, data, 'Plan updated');
});

export const adminUserEntitlements = asyncHandler(async (req, res) => {
  const data = await subscriptionService.getEntitlementsForUserUuid(req.params.uuid);
  return ApiResponse.success(res, data);
});

export const adminSetUserEntitlements = asyncHandler(async (req, res) => {
  const data = await subscriptionService.adminSetEntitlementOverride(
    req.params.uuid,
    req.body,
    req.user,
    req
  );
  return ApiResponse.success(res, data, 'Posting limits updated');
});

export const adminGrantSubscription = asyncHandler(async (req, res) => {
  const data = await subscriptionService.adminGrantSubscription(
    req.params.uuid,
    req.body,
    req.user,
    req
  );
  return ApiResponse.success(res, data, 'Subscription granted');
});

// Ads
export const listAds = asyncHandler(async (req, res) => {
  const data = await advertisementService.listPublicAds({
    placement: req.query.placement,
    cityId: req.query.cityId,
  });
  return ApiResponse.success(res, data);
});

export const adminListAds = asyncHandler(async (req, res) => {
  const data = await advertisementService.adminListAds();
  return ApiResponse.success(res, data);
});

export const createAd = asyncHandler(async (req, res) => {
  const data = await advertisementService.createAd(req.body, req.user, req, req.file);
  return ApiResponse.created(res, data, 'Advertisement created');
});

export const updateAd = asyncHandler(async (req, res) => {
  const data = await advertisementService.updateAd(
    req.params.uuid,
    req.body,
    req.user,
    req,
    req.file
  );
  return ApiResponse.success(res, data, 'Advertisement updated');
});

export const deleteAd = asyncHandler(async (req, res) => {
  await advertisementService.deleteAd(req.params.uuid, req.user, req);
  return ApiResponse.success(res, null, 'Advertisement deleted');
});

// CMS public
export const getCmsPage = asyncHandler(async (req, res) => {
  const data = await cmsService.getPageBySlug(req.params.slug);
  return ApiResponse.success(res, data);
});

export const listCmsPages = asyncHandler(async (req, res) => {
  const data = await cmsService.listPages({ pageType: req.query.pageType });
  return ApiResponse.success(res, data);
});

export const listBlogs = asyncHandler(async (req, res) => {
  const data = await cmsService.listBlogs({ limit: Number(req.query.limit || 20) });
  return ApiResponse.success(res, data);
});

export const getBlog = asyncHandler(async (req, res) => {
  const data = await cmsService.getBlogBySlug(req.params.slug);
  return ApiResponse.success(res, data);
});

export const listNews = asyncHandler(async (req, res) => {
  const data = await cmsService.listNews({ limit: Number(req.query.limit || 20) });
  return ApiResponse.success(res, data);
});

export const getNews = asyncHandler(async (req, res) => {
  const data = await cmsService.getNewsBySlug(req.params.slug);
  return ApiResponse.success(res, data);
});

export const listBanners = asyncHandler(async (req, res) => {
  const data = await cmsService.listBanners({ position: req.query.position });
  return ApiResponse.success(res, data);
});

// CMS admin
export const adminListPages = asyncHandler(async (req, res) => {
  const data = await cmsService.listPages({ pageType: req.query.pageType, admin: true });
  return ApiResponse.success(res, data);
});

export const adminUpsertPage = asyncHandler(async (req, res) => {
  const data = await cmsService.upsertPage(req.body, req.user, req, req.params.uuid);
  return req.params.uuid
    ? ApiResponse.success(res, data, 'Page updated')
    : ApiResponse.created(res, data, 'Page created');
});

export const adminListBlogs = asyncHandler(async (req, res) => {
  const data = await cmsService.listBlogs({ admin: true, limit: 100 });
  return ApiResponse.success(res, data);
});

export const adminUpsertBlog = asyncHandler(async (req, res) => {
  const data = await cmsService.upsertBlog(req.body, req.user, req, req.params.uuid, req.file);
  return req.params.uuid
    ? ApiResponse.success(res, data, 'Blog updated')
    : ApiResponse.created(res, data, 'Blog created');
});

export const adminDeleteBlog = asyncHandler(async (req, res) => {
  await cmsService.deleteBlog(req.params.uuid, req.user, req);
  return ApiResponse.success(res, null, 'Blog deleted');
});

export const adminListNews = asyncHandler(async (req, res) => {
  const data = await cmsService.listNews({ admin: true, limit: 100 });
  return ApiResponse.success(res, data);
});

export const adminUpsertNews = asyncHandler(async (req, res) => {
  const data = await cmsService.upsertNews(req.body, req.user, req, req.params.uuid, req.file);
  return req.params.uuid
    ? ApiResponse.success(res, data, 'News updated')
    : ApiResponse.created(res, data, 'News created');
});

export const adminDeleteNews = asyncHandler(async (req, res) => {
  await cmsService.deleteNews(req.params.uuid, req.user, req);
  return ApiResponse.success(res, null, 'News deleted');
});

export const adminListBanners = asyncHandler(async (req, res) => {
  const data = await cmsService.listBanners({ admin: true });
  return ApiResponse.success(res, data);
});

export const adminUpsertBanner = asyncHandler(async (req, res) => {
  const data = await cmsService.upsertBanner(req.body, req.user, req, req.params.uuid);
  return req.params.uuid
    ? ApiResponse.success(res, data, 'Banner updated')
    : ApiResponse.created(res, data, 'Banner created');
});

// Reports
export const getReports = asyncHandler(async (req, res) => {
  const data = await reportService.getRoleReports(req.user);
  return ApiResponse.success(res, data);
});

export const createPropertyReport = asyncHandler(async (req, res) => {
  const data = await reportService.createPropertyReport(req.body, req.user, req);
  return ApiResponse.created(res, data, 'Report submitted');
});

export const listPropertyReports = asyncHandler(async (req, res) => {
  const result = await reportService.listPropertyReports({
    page: Number(req.query.page || 1),
    limit: Number(req.query.limit || 20),
    status: req.query.status,
  });
  return ApiResponse.success(res, result.items, 'Property reports', 200, result.meta);
});

export const updatePropertyReport = asyncHandler(async (req, res) => {
  const data = await reportService.updatePropertyReport(req.params.uuid, req.body, req.user, req);
  return ApiResponse.success(res, data, 'Report updated');
});
