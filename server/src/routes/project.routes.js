import { Router } from 'express';
import { body, param } from 'express-validator';
import * as ctrl from '../controllers/project.controller.js';
import {
  authenticate,
  authorize,
  authorizeRoles,
  optionalAuthenticate,
} from '../middlewares/authenticate.js';
import { validate } from '../validators/auth.validator.js';
import { uploadMultiple, uploadProjectImageMultiple, uploadProjectImageSingle } from '../middlewares/upload.js';

const router = Router();

// Builders — /me routes before :uuid
router.get(
  '/builders/me/profile',
  authenticate,
  authorizeRoles('BUILDER'),
  ctrl.getMyBuilderProfile
);
router.put(
  '/builders/me/profile',
  authenticate,
  authorizeRoles('BUILDER'),
  body('companyName').optional().trim().notEmpty(),
  validate,
  ctrl.updateMyBuilderProfile
);
router.get('/builders/me/team', authenticate, authorizeRoles('BUILDER'), ctrl.listTeam);
router.post(
  '/builders/me/team',
  authenticate,
  authorizeRoles('BUILDER'),
  body('name').trim().notEmpty(),
  validate,
  ctrl.addTeamMember
);
router.delete(
  '/builders/me/team/:uuid',
  authenticate,
  authorizeRoles('BUILDER'),
  param('uuid').isUUID(),
  validate,
  ctrl.removeTeamMember
);
router.get('/builders', ctrl.listBuilders);
router.get('/builders/:uuid', param('uuid').isUUID(), validate, ctrl.getBuilder);

router.get(
  '/admin/builder-profile-changes',
  authenticate,
  authorizeRoles('SUPER_ADMIN', 'ADMIN'),
  ctrl.listBuilderProfileChanges
);
router.patch(
  '/admin/builder-profile-changes/:uuid',
  authenticate,
  authorizeRoles('SUPER_ADMIN', 'ADMIN'),
  param('uuid').isUUID(),
  body('status').isIn(['approved', 'rejected']),
  body('reviewerNotes').optional().trim(),
  validate,
  ctrl.reviewBuilderProfileChange
);

// Projects — specific paths before :uuid
router.get('/projects', optionalAuthenticate, ctrl.listProjects);
router.get('/projects/slug/:slug', ctrl.getProjectBySlug);
router.get('/projects/mine/stats', authenticate, authorize('projects.read'), ctrl.myProjectStats);
router.get('/projects/mine', authenticate, authorize('projects.read'), ctrl.listMyProjects);
router.get('/projects/wishlist', authenticate, ctrl.listProjectWishlist);
router.get(
  '/projects/admin',
  authenticate,
  authorizeRoles('SUPER_ADMIN', 'ADMIN'),
  ctrl.adminListProjects
);
router.post(
  '/projects',
  authenticate,
  authorize('projects.create'),
  body('name').trim().notEmpty(),
  body('description').trim().isLength({ min: 10 }),
  validate,
  ctrl.createProject
);
router.get('/projects/:uuid', optionalAuthenticate, param('uuid').isUUID(), validate, ctrl.getProject);
router.post(
  '/projects/:uuid/wishlist',
  authenticate,
  param('uuid').isUUID(),
  validate,
  ctrl.toggleProjectWishlist
);
router.put(
  '/projects/:uuid',
  authenticate,
  authorize('projects.update'),
  param('uuid').isUUID(),
  validate,
  ctrl.updateProject
);
router.patch(
  '/projects/:uuid/status',
  authenticate,
  param('uuid').isUUID(),
  body('status').isIn(['draft', 'pending', 'published', 'rejected', 'archived']),
  body('rejectionReason').optional().trim(),
  body('resubmitNote').optional().trim(),
  validate,
  ctrl.updateProjectStatus
);
router.get(
  '/projects/:uuid/review',
  authenticate,
  param('uuid').isUUID(),
  validate,
  ctrl.getProjectReview
);
router.post(
  '/projects/:uuid/review/complete',
  authenticate,
  authorizeRoles('SUPER_ADMIN', 'ADMIN'),
  param('uuid').isUUID(),
  body('items').isArray({ min: 1 }),
  body('items.*.id').isUUID(),
  body('items.*.status').isIn(['approved', 'rejected']),
  body('items.*.sectionKey').optional().trim(),
  body('items.*.entityUuid').optional({ nullable: true }).isUUID(),
  body('items.*.rating').optional({ nullable: true }).isInt({ min: 0, max: 10 }),
  body('items.*.rejectionReason').optional({ nullable: true }).trim(),
  body('reviewerNotes').optional().trim(),
  validate,
  ctrl.completeProjectReview
);
router.delete(
  '/projects/:uuid',
  authenticate,
  authorize('projects.delete'),
  param('uuid').isUUID(),
  validate,
  ctrl.deleteProject
);

router.post(
  '/projects/:uuid/buildings',
  authenticate,
  authorize('projects.update'),
  body('name').trim().notEmpty(),
  body('isActive').optional().isBoolean(),
  validate,
  ctrl.addBuilding
);
router.patch(
  '/projects/:uuid/buildings/:buildingUuid',
  authenticate,
  authorize('projects.update'),
  param('buildingUuid').isUUID(),
  body('isActive').optional().isBoolean(),
  validate,
  ctrl.updateBuilding
);
router.delete(
  '/projects/:uuid/buildings/:buildingUuid',
  authenticate,
  authorize('projects.update'),
  param('buildingUuid').isUUID(),
  validate,
  ctrl.deleteBuilding
);

router.post(
  '/projects/:uuid/towers',
  authenticate,
  authorize('projects.update'),
  body('name').trim().notEmpty(),
  body('totalFloors').optional({ nullable: true }).isInt({ min: 0 }),
  body('totalUnits').optional({ nullable: true }).isInt({ min: 0 }),
  body('buildingId').optional({ nullable: true }).isUUID(),
  body('isActive').optional().isBoolean(),
  body('units').optional().isArray(),
  body('units.*.unitNumber').optional().trim().notEmpty(),
  validate,
  ctrl.addTower
);
router.patch(
  '/projects/:uuid/towers/:towerUuid',
  authenticate,
  authorize('projects.update'),
  param('towerUuid').isUUID(),
  body('totalFloors').optional({ nullable: true }).isInt({ min: 0 }),
  body('totalUnits').optional({ nullable: true }).isInt({ min: 0 }),
  body('buildingId').optional({ nullable: true }),
  body('isActive').optional().isBoolean(),
  validate,
  ctrl.updateTower
);
router.delete(
  '/projects/:uuid/towers/:towerUuid',
  authenticate,
  authorize('projects.update'),
  ctrl.deleteTower
);
router.post(
  '/projects/:uuid/units',
  authenticate,
  authorize('projects.update'),
  body('unitNumber').trim().notEmpty(),
  validate,
  ctrl.addUnit
);
router.patch(
  '/projects/:uuid/units/:unitUuid/status',
  authenticate,
  authorize('projects.update'),
  body('status').isIn(['available', 'held', 'sold', 'blocked']),
  validate,
  ctrl.updateUnitStatus
);
router.post(
  '/projects/:uuid/media',
  authenticate,
  authorize('projects.update'),
  uploadProjectImageMultiple('files', 12),
  ctrl.addProjectMedia
);
router.patch(
  '/projects/:uuid/media/:mediaUuid',
  authenticate,
  authorize('projects.update'),
  param('mediaUuid').isUUID(),
  validate,
  ctrl.updateProjectMedia
);
router.post(
  '/projects/:uuid/amenities/:amenityUuid/image',
  authenticate,
  authorize('projects.update'),
  param('amenityUuid').isUUID(),
  validate,
  uploadProjectImageSingle('file'),
  ctrl.uploadProjectAmenityImage
);
router.delete(
  '/projects/:uuid/media/:mediaUuid',
  authenticate,
  authorize('projects.update'),
  ctrl.deleteProjectMedia
);

router.post(
  '/inventory/units/:unitUuid/hold',
  authenticate,
  param('unitUuid').isUUID(),
  validate,
  ctrl.holdUnit
);
router.delete(
  '/inventory/units/:unitUuid/hold',
  authenticate,
  param('unitUuid').isUUID(),
  validate,
  ctrl.releaseHold
);

router.post(
  '/bookings',
  authenticate,
  body('projectId').isUUID(),
  validate,
  ctrl.createBooking
);
router.get('/bookings', authenticate, ctrl.listBookings);
router.get('/bookings/:uuid', authenticate, param('uuid').isUUID(), validate, ctrl.getBooking);
router.patch(
  '/bookings/:uuid',
  authenticate,
  authorizeRoles('BUILDER', 'ADMIN', 'SUPER_ADMIN'),
  param('uuid').isUUID(),
  body('status').isIn(['requested', 'confirmed', 'cancelled', 'completed']),
  validate,
  ctrl.updateBooking
);

export default router;
