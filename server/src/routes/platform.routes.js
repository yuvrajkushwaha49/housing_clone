import { Router } from 'express';
import { body, param } from 'express-validator';
import * as ctrl from '../controllers/platform.controller.js';
import { authenticate, authorize, authorizeRoles } from '../middlewares/authenticate.js';
import { validate } from '../validators/auth.validator.js';
import { uploadSingle } from '../middlewares/upload.js';

const router = Router();

const cmsRoles = authorizeRoles('CMS_MANAGER', 'ADMIN', 'SUPER_ADMIN');
const adsRoles = authorizeRoles('SUPER_ADMIN', 'ADMIN');
const subAdmin = authorizeRoles('SUPER_ADMIN', 'ADMIN');
const supportStaff = authorizeRoles('SUPPORT', 'ADMIN', 'SUPER_ADMIN');

// —— Subscriptions ——
router.get('/subscription-plans', ctrl.listPlans);
router.get('/subscriptions/me', authenticate, ctrl.mySubscription);
router.post(
  '/subscriptions',
  authenticate,
  body('planId').isUUID(),
  validate,
  ctrl.startSubscription
);
router.get('/admin/subscriptions', authenticate, subAdmin, ctrl.adminListSubscriptions);
router.post(
  '/admin/subscription-plans',
  authenticate,
  authorize('subscriptions.manage'),
  body('name').trim().notEmpty(),
  body('roleScope').isIn(['agent', 'owner', 'builder']),
  body('price').isFloat({ min: 0 }),
  body('durationDays').isInt({ min: 1 }),
  body('listingLimit').isInt({ min: 0 }),
  validate,
  ctrl.adminCreatePlan
);
router.put(
  '/admin/subscription-plans/:uuid',
  authenticate,
  authorize('subscriptions.manage'),
  param('uuid').isUUID(),
  validate,
  ctrl.adminUpdatePlan
);
router.get(
  '/admin/users/:uuid/entitlements',
  authenticate,
  authorize('subscriptions.manage'),
  param('uuid').isUUID(),
  validate,
  ctrl.adminUserEntitlements
);
router.patch(
  '/admin/users/:uuid/entitlements',
  authenticate,
  authorize('subscriptions.manage'),
  param('uuid').isUUID(),
  body('listingLimitBonus').optional().isInt({ min: 0 }),
  body('featuredLimitBonus').optional().isInt({ min: 0 }),
  validate,
  ctrl.adminSetUserEntitlements
);
router.post(
  '/admin/users/:uuid/subscriptions',
  authenticate,
  authorize('subscriptions.manage'),
  param('uuid').isUUID(),
  body('planId').isUUID(),
  validate,
  ctrl.adminGrantSubscription
);

// —— Advertisements ——
router.get('/advertisements', ctrl.listAds);
router.get('/admin/advertisements', authenticate, adsRoles, ctrl.adminListAds);
router.post(
  '/admin/advertisements',
  authenticate,
  authorize('advertisements.manage'),
  uploadSingle('image'),
  body('title').trim().notEmpty(),
  validate,
  ctrl.createAd
);
router.put(
  '/admin/advertisements/:uuid',
  authenticate,
  authorize('advertisements.manage'),
  uploadSingle('image'),
  param('uuid').isUUID(),
  validate,
  ctrl.updateAd
);
router.delete(
  '/admin/advertisements/:uuid',
  authenticate,
  authorize('advertisements.manage'),
  param('uuid').isUUID(),
  validate,
  ctrl.deleteAd
);

// —— CMS public ——
router.get('/cms/pages', ctrl.listCmsPages);
router.get('/cms/pages/:slug', ctrl.getCmsPage);
router.get('/cms/blogs', ctrl.listBlogs);
router.get('/cms/blogs/:slug', ctrl.getBlog);
router.get('/cms/news', ctrl.listNews);
router.get('/cms/news/:slug', ctrl.getNews);
router.get('/cms/banners', ctrl.listBanners);

// —— CMS admin ——
router.get('/cms/admin/pages', authenticate, cmsRoles, ctrl.adminListPages);
router.post(
  '/cms/admin/pages',
  authenticate,
  cmsRoles,
  body('title').trim().notEmpty(),
  body('body').trim().notEmpty(),
  validate,
  ctrl.adminUpsertPage
);
router.put(
  '/cms/admin/pages/:uuid',
  authenticate,
  cmsRoles,
  param('uuid').isUUID(),
  body('title').trim().notEmpty(),
  body('body').trim().notEmpty(),
  validate,
  ctrl.adminUpsertPage
);
router.get('/cms/admin/blogs', authenticate, cmsRoles, ctrl.adminListBlogs);
router.post(
  '/cms/admin/blogs',
  authenticate,
  cmsRoles,
  body('title').trim().notEmpty(),
  body('body').trim().notEmpty(),
  validate,
  ctrl.adminUpsertBlog
);
router.put(
  '/cms/admin/blogs/:uuid',
  authenticate,
  cmsRoles,
  param('uuid').isUUID(),
  validate,
  ctrl.adminUpsertBlog
);
router.get('/cms/admin/news', authenticate, cmsRoles, ctrl.adminListNews);
router.post(
  '/cms/admin/news',
  authenticate,
  cmsRoles,
  body('title').trim().notEmpty(),
  body('body').trim().notEmpty(),
  validate,
  ctrl.adminUpsertNews
);
router.put(
  '/cms/admin/news/:uuid',
  authenticate,
  cmsRoles,
  param('uuid').isUUID(),
  validate,
  ctrl.adminUpsertNews
);
router.get('/cms/admin/banners', authenticate, cmsRoles, ctrl.adminListBanners);
router.post(
  '/cms/admin/banners',
  authenticate,
  cmsRoles,
  body('title').trim().notEmpty(),
  validate,
  ctrl.adminUpsertBanner
);
router.put(
  '/cms/admin/banners/:uuid',
  authenticate,
  cmsRoles,
  param('uuid').isUUID(),
  validate,
  ctrl.adminUpsertBanner
);

// —— Reports ——
router.get('/reports', authenticate, ctrl.getReports);
router.post(
  '/property-reports',
  authenticate,
  body('propertyId').isUUID(),
  body('reason').isIn(['spam', 'fraud', 'incorrect', 'duplicate', 'offensive', 'other']),
  validate,
  ctrl.createPropertyReport
);
router.get('/property-reports', authenticate, supportStaff, ctrl.listPropertyReports);
router.patch(
  '/property-reports/:uuid',
  authenticate,
  supportStaff,
  param('uuid').isUUID(),
  body('status').isIn(['open', 'reviewing', 'resolved', 'dismissed']),
  validate,
  ctrl.updatePropertyReport
);

export default router;
