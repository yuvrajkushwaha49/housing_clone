import { body, param, query as q } from 'express-validator';
import { validate } from './auth.validator.js';

export { validate };

export const inquiryRules = [
  body('propertyId').isUUID().withMessage('propertyId required'),
  body('message').trim().isLength({ min: 10, max: 2000 }).withMessage('Message min 10 chars'),
  body('name').optional({ nullable: true }).trim().isLength({ max: 150 }),
  body('email').optional({ nullable: true }).isEmail().normalizeEmail(),
  body('phone').optional({ nullable: true }).trim().isLength({ min: 8, max: 20 }).withMessage('Phone must be 8-20 characters'),
];

export const sellerContactRules = [
  body('projectId').isUUID().withMessage('projectId required'),
  body('name').trim().isLength({ min: 2, max: 150 }).withMessage('Name is required'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('phone').trim().isLength({ min: 8, max: 20 }).withMessage('Phone must be 8-20 characters'),
  body('message').optional({ nullable: true }).trim().isLength({ max: 2000 }),
  body('interestedLoan').optional({ values: 'falsy' }).isBoolean().toBoolean(),
  body('unitLabel').optional({ nullable: true }).trim().isLength({ max: 120 }),
];

export const inquiryStatusRules = [
  param('uuid').isUUID(),
  body('status').isIn(['new', 'read', 'responded', 'closed']),
];

export const leadUpdateRules = [
  param('uuid').isUUID(),
  body('status')
    .optional()
    .isIn(['new', 'contacted', 'qualified', 'negotiation', 'won', 'lost']),
  body('notes').optional({ nullable: true }).isString().isLength({ max: 5000 }),
];

export const visitRules = [
  body('propertyId').isUUID(),
  body('scheduledAt').isISO8601().withMessage('scheduledAt must be ISO date'),
  body('name').optional({ nullable: true }).trim().isLength({ max: 150 }),
  body('email').optional({ nullable: true }).isEmail().normalizeEmail(),
  body('phone').optional({ nullable: true }).trim().isLength({ min: 8, max: 20 }).withMessage('Phone must be 8-20 characters'),
  body('notes').optional({ nullable: true }).isLength({ max: 2000 }),
];

export const visitStatusRules = [
  param('uuid').isUUID(),
  body('status').isIn(['requested', 'confirmed', 'completed', 'cancelled', 'no_show']),
  body('hostNotes').optional({ nullable: true }).isLength({ max: 2000 }),
];

export const listRules = [
  q('page').optional().isInt({ min: 1 }),
  q('limit').optional().isInt({ min: 1, max: 50 }),
  q('status').optional().isString(),
  q('source').optional().isString(),
  q('listingType').optional().isIn(['project', 'property']),
  q('cityId').optional().isUUID(),
  q('q').optional().isString().isLength({ max: 200 }),
  q('dateFrom').optional().matches(/^\d{4}-\d{2}-\d{2}$/).withMessage('dateFrom must be YYYY-MM-DD'),
  q('dateTo').optional().matches(/^\d{4}-\d{2}-\d{2}$/).withMessage('dateTo must be YYYY-MM-DD'),
];
