import { Router } from 'express';
import * as leadController from '../controllers/lead.controller.js';
import {
  authenticate,
  authorize,
  authorizeRoles,
} from '../middlewares/authenticate.js';
import {
  inquiryRules,
  inquiryStatusRules,
  leadUpdateRules,
  listRules,
  sellerContactRules,
  validate,
  visitRules,
  visitStatusRules,
} from '../validators/lead.validator.js';

const router = Router();

router.post(
  '/inquiries',
  authenticate,
  authorizeRoles('BUYER'),
  inquiryRules,
  validate,
  leadController.createInquiry
);

router.post(
  '/leads/contact',
  authenticate,
  sellerContactRules,
  validate,
  leadController.createSellerContact
);
router.get(
  '/inquiries',
  authenticate,
  authorize('leads.read'),
  listRules,
  validate,
  leadController.listInquiries
);
router.patch(
  '/inquiries/:uuid/status',
  authenticate,
  authorize('leads.manage'),
  inquiryStatusRules,
  validate,
  leadController.updateInquiryStatus
);

router.get(
  '/leads',
  authenticate,
  authorize('leads.read'),
  listRules,
  validate,
  leadController.listLeads
);
router.patch(
  '/leads/:uuid',
  authenticate,
  authorize('leads.manage'),
  leadUpdateRules,
  validate,
  leadController.updateLead
);

router.post(
  '/visits',
  authenticate,
  authorizeRoles('BUYER'),
  visitRules,
  validate,
  leadController.createVisit
);
router.get(
  '/visits',
  authenticate,
  listRules,
  validate,
  leadController.listVisits
);
router.patch(
  '/visits/:uuid/status',
  authenticate,
  visitStatusRules,
  validate,
  leadController.updateVisitStatus
);

router.get(
  '/admin/approval-stats',
  authenticate,
  authorizeRoles('SUPER_ADMIN', 'ADMIN'),
  leadController.approvalStats
);

router.get('/notifications', authenticate, leadController.listNotifications);
router.get('/notifications/unread-count', authenticate, leadController.unreadNotificationCount);
router.post('/notifications/ack', authenticate, leadController.acknowledgeNotifications);
router.patch('/notifications/read-all', authenticate, leadController.markAllNotificationsRead);
router.patch('/notifications/:uuid/read', authenticate, leadController.markNotificationRead);

export default router;
