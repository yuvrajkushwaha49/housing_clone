import { Router } from 'express';
import { body, param } from 'express-validator';
import * as propertyController from '../controllers/property.controller.js';
import { authenticate, authorize, authorizeRoles } from '../middlewares/authenticate.js';
import { uploadMultiple } from '../middlewares/upload.js';
import {
  propertyRules,
  propertySearchRules,
  propertyStatusRules,
  validate,
} from '../validators/masters.validator.js';

const router = Router();

router.get('/', propertySearchRules, validate, propertyController.search);
router.get('/slug/:slug', propertyController.getBySlug);

router.get('/wishlist', authenticate, propertyController.listWishlist);
router.post('/:uuid/wishlist', authenticate, propertyController.toggleWishlist);

router.get('/compare', authenticate, propertyController.listCompare);
router.delete('/compare', authenticate, propertyController.clearCompare);
router.post('/:uuid/compare', authenticate, propertyController.toggleCompare);
router.delete('/:uuid/compare', authenticate, propertyController.removeCompare);

router.get(
  '/mine/stats',
  authenticate,
  authorize('properties.read'),
  propertyController.mineStats
);

router.get(
  '/mine',
  authenticate,
  authorize('properties.read'),
  propertyController.mine
);

router.get(
  '/admin',
  authenticate,
  authorize('properties.read'),
  authorizeRoles('SUPER_ADMIN', 'ADMIN'),
  propertyController.adminList
);

router.get('/:uuid', authenticate, propertyController.getById);

router.post(
  '/',
  authenticate,
  authorize('properties.create'),
  authorizeRoles('OWNER', 'AGENT', 'BUILDER', 'SUPER_ADMIN'),
  propertyRules,
  validate,
  propertyController.create
);

router.put(
  '/:uuid',
  authenticate,
  authorize('properties.update'),
  propertyRules,
  validate,
  propertyController.update
);

router.patch(
  '/:uuid/status',
  authenticate,
  propertyStatusRules,
  validate,
  propertyController.updateStatus
);

router.get(
  '/:uuid/review',
  authenticate,
  param('uuid').isUUID(),
  validate,
  propertyController.getPropertyReview
);

router.post(
  '/:uuid/review/complete',
  authenticate,
  authorizeRoles('SUPER_ADMIN', 'ADMIN'),
  param('uuid').isUUID(),
  body('propertyDecision').optional().isIn(['rejected']),
  body('rejectionReason').optional().trim(),
  body('items').optional().isArray(),
  body('items.*.id').optional().isUUID(),
  body('items.*.status').optional().isIn(['approved', 'rejected']),
  body('items.*.sectionKey').optional().trim(),
  body('items.*.fieldKey').optional().trim(),
  body('items.*.entityUuid')
    .optional({ nullable: true, checkFalsy: true })
    .isString()
    .trim()
    .isLength({ max: 64 }),
  body('items.*.rating').optional({ nullable: true }).isFloat({ min: 0, max: 10 }),
  body('items.*.rejectionReason').optional({ nullable: true }).trim(),
  body('reviewerNotes').optional().trim(),
  validate,
  propertyController.completePropertyReview
);

router.delete(
  '/:uuid',
  authenticate,
  authorize('properties.delete'),
  propertyController.remove
);

router.post(
  '/:uuid/media',
  authenticate,
  authorize('properties.update'),
  uploadMultiple('files', 12),
  propertyController.uploadMedia
);

router.delete(
  '/:uuid/media/:mediaUuid',
  authenticate,
  authorize('properties.update'),
  propertyController.deleteMedia
);

export default router;
