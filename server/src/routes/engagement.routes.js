import { Router } from 'express';
import * as ctrl from '../controllers/engagement.controller.js';
import { authenticate, authorize, authorizeRoles } from '../middlewares/authenticate.js';
import { body, param } from 'express-validator';
import { validate } from '../validators/auth.validator.js';

const router = Router();

// Chat
router.get('/conversations', authenticate, authorize('chat.access'), ctrl.listConversations);
router.post(
  '/conversations',
  authenticate,
  authorize('chat.access'),
  body('type').isIn(['direct', 'support', 'property']),
  body('message').optional().isString(),
  validate,
  ctrl.startConversation
);
router.get(
  '/conversations/:uuid',
  authenticate,
  authorize('chat.access'),
  param('uuid').isUUID(),
  validate,
  ctrl.getConversation
);
router.get(
  '/conversations/:uuid/messages',
  authenticate,
  authorize('chat.access'),
  ctrl.listMessages
);
router.post(
  '/conversations/:uuid/messages',
  authenticate,
  authorize('chat.access'),
  body('body').trim().isLength({ min: 1, max: 5000 }),
  validate,
  ctrl.sendMessage
);

// Reviews
router.post(
  '/reviews',
  authenticate,
  authorizeRoles('BUYER'),
  body('propertyId').isUUID(),
  body('rating').isInt({ min: 1, max: 5 }),
  body('body').trim().isLength({ min: 10 }),
  validate,
  ctrl.createReview
);
router.get('/reviews/mine', authenticate, ctrl.listMyReviews);
router.get('/reviews/pending', authenticate, authorize('reviews.moderate'), ctrl.listPendingReviews);
router.patch(
  '/reviews/:uuid/moderate',
  authenticate,
  authorize('reviews.moderate'),
  body('status').isIn(['approved', 'rejected']),
  validate,
  ctrl.moderateReview
);
router.get('/properties/:propertyUuid/reviews', ctrl.listPropertyReviews);

// Support tickets
router.post(
  '/tickets',
  authenticate,
  body('subject').trim().notEmpty(),
  body('message').trim().isLength({ min: 10 }),
  validate,
  ctrl.createTicket
);
router.get('/tickets', authenticate, ctrl.listTickets);
router.get('/tickets/:uuid', authenticate, ctrl.getTicket);
router.post(
  '/tickets/:uuid/messages',
  authenticate,
  body('message').trim().isLength({ min: 1 }),
  validate,
  ctrl.addTicketMessage
);
router.patch(
  '/tickets/:uuid',
  authenticate,
  authorizeRoles('SUPPORT', 'ADMIN', 'SUPER_ADMIN'),
  ctrl.updateTicket
);

// FAQ + complaints
router.get('/faqs', ctrl.listFaqs);
router.post(
  '/faqs',
  authenticate,
  authorizeRoles('SUPPORT', 'ADMIN', 'SUPER_ADMIN', 'CMS_MANAGER'),
  body('question').trim().notEmpty(),
  body('answer').trim().notEmpty(),
  validate,
  ctrl.createFaq
);
router.post(
  '/complaints',
  authenticate,
  body('subject').trim().notEmpty(),
  body('description').trim().isLength({ min: 10 }),
  validate,
  ctrl.createComplaint
);
router.get('/complaints', authenticate, ctrl.listComplaints);

export default router;
