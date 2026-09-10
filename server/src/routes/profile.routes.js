import { Router } from 'express';
import { body, param } from 'express-validator';
import * as ctrl from '../controllers/profile.controller.js';
import { authenticate, authorize, authorizeRoles, optionalAuthenticate } from '../middlewares/authenticate.js';
import { validate } from '../validators/auth.validator.js';

const router = Router();

router.get('/sellers/recommended', optionalAuthenticate, ctrl.listRecommendedSellers);

router.get(
  '/profiles/me',
  authenticate,
  authorizeRoles('AGENT', 'OWNER', 'BUILDER', 'BUYER'),
  ctrl.getMyProfile
);
router.put(
  '/profiles/me',
  authenticate,
  authorizeRoles('AGENT', 'OWNER', 'BUILDER', 'BUYER'),
  ctrl.updateMyProfile
);

router.post(
  '/verification-requests',
  authenticate,
  authorizeRoles('AGENT', 'OWNER', 'BUILDER'),
  body('message').optional().isString(),
  validate,
  ctrl.submitVerification
);
router.get(
  '/verification-requests/mine',
  authenticate,
  authorizeRoles('AGENT', 'OWNER', 'BUILDER'),
  ctrl.listMyVerifications
);
router.get(
  '/verification-requests',
  authenticate,
  authorize('users.verify'),
  ctrl.listVerificationQueue
);
router.patch(
  '/verification-requests/:uuid',
  authenticate,
  authorize('users.verify'),
  param('uuid').isUUID(),
  body('status').isIn(['approved', 'rejected']),
  validate,
  ctrl.reviewVerification
);

export default router;
