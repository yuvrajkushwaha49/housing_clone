import { Router } from 'express';
import { body } from 'express-validator';
import * as ctrl from '../controllers/settings.controller.js';
import { authenticate, authorizeRoles } from '../middlewares/authenticate.js';
import { validate } from '../validators/auth.validator.js';

const router = Router();

router.get('/settings/public', ctrl.getPublicSettings);
router.get(
  '/settings',
  authenticate,
  authorizeRoles('SUPER_ADMIN', 'ADMIN'),
  ctrl.listSettings
);
router.put(
  '/settings',
  authenticate,
  authorizeRoles('SUPER_ADMIN', 'ADMIN'),
  body('settings').isArray({ min: 1 }),
  validate,
  ctrl.upsertSettings
);

export default router;
