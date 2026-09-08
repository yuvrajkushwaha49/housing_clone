import { body, param, query as q, validationResult } from 'express-validator';
import ApiError from '../utils/ApiError.js';
import { REGISTERABLE_ROLES } from '../models/constants.js';

export const validate = (req, _res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(
      new ApiError(
        400,
        'Validation failed',
        errors.array().map((e) => ({ field: e.path, message: e.msg })),
        'VALIDATION_ERROR'
      )
    );
  }
  return next();
};

export const registerRules = [
  body('email').isEmail().withMessage('Valid email required').normalizeEmail(),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/[A-Z]/)
    .withMessage('Password must include an uppercase letter')
    .matches(/[a-z]/)
    .withMessage('Password must include a lowercase letter')
    .matches(/[0-9]/)
    .withMessage('Password must include a number'),
  body('firstName').trim().notEmpty().withMessage('First name required').isLength({ max: 100 }),
  body('lastName').optional({ nullable: true }).trim().isLength({ max: 100 }),
  body('phone')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ min: 8, max: 20 })
    .withMessage('Phone must be 8–20 characters'),
  body('role')
    .optional()
    .isIn(REGISTERABLE_ROLES)
    .withMessage(`Role must be one of: ${REGISTERABLE_ROLES.join(', ')}`),
];

export const loginRules = [
  body('email').isEmail().withMessage('Valid email required').normalizeEmail(),
  body('password').notEmpty().withMessage('Password required'),
];

export const forgotPasswordRules = [
  body('email').isEmail().withMessage('Valid email required').normalizeEmail(),
];

export const resetPasswordRules = [
  body('token').notEmpty().withMessage('Token required'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/[A-Z]/)
    .withMessage('Password must include an uppercase letter')
    .matches(/[a-z]/)
    .withMessage('Password must include a lowercase letter')
    .matches(/[0-9]/)
    .withMessage('Password must include a number'),
];

export const changePasswordRules = [
  body('currentPassword').notEmpty().withMessage('Current password required'),
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/[A-Z]/)
    .withMessage('Password must include an uppercase letter')
    .matches(/[a-z]/)
    .withMessage('Password must include a lowercase letter')
    .matches(/[0-9]/)
    .withMessage('Password must include a number'),
];

export const otpRequestRules = [
  body('email').isEmail().withMessage('Valid email required').normalizeEmail(),
];

export const otpVerifyRules = [
  body('email').isEmail().withMessage('Valid email required').normalizeEmail(),
  body('otp').isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits'),
];

export const rolePermissionRules = [
  param('uuid').isUUID().withMessage('Valid role uuid required'),
  body('permissions').isArray({ min: 1 }).withMessage('permissions array required'),
  body('permissions.*').isString().notEmpty(),
];

export const createRoleRules = [
  body('code').trim().notEmpty().isLength({ min: 2, max: 50 }),
  body('name').trim().notEmpty().isLength({ min: 2, max: 100 }),
  body('description').optional({ nullable: true }).isLength({ max: 255 }),
];

export const listUsersRules = [
  q('page').optional().isInt({ min: 1 }),
  q('limit').optional().isInt({ min: 1, max: 100 }),
  q('search').optional({ values: 'falsy' }).isString(),
  q('roleCode').optional({ values: 'falsy' }).isString(),
  q('status')
    .optional({ values: 'falsy' })
    .isIn(['pending', 'active', 'suspended', 'banned']),
  q('emailVerified')
    .optional({ values: 'falsy' })
    .isIn(['true', 'false']),
];

export const userUuidRules = [param('uuid').isUUID().withMessage('Valid user uuid required')];

const passwordFieldRules = body('password')
  .notEmpty()
  .withMessage('Password required')
  .isLength({ min: 8 })
  .withMessage('Password must be at least 8 characters')
  .matches(/[A-Z]/)
  .withMessage('Password must include an uppercase letter')
  .matches(/[a-z]/)
  .withMessage('Password must include a lowercase letter')
  .matches(/[0-9]/)
  .withMessage('Password must include a number');

export const updateUserRules = [
  param('uuid').isUUID().withMessage('Valid user uuid required'),
  body('firstName').optional().trim().notEmpty().withMessage('First name required').isLength({ max: 100 }),
  body('lastName').optional({ nullable: true }).trim().isLength({ max: 100 }),
  body('email').optional().isEmail().withMessage('Valid email required').normalizeEmail(),
  body('phone')
    .optional({ nullable: true, values: 'falsy' })
    .trim()
    .isLength({ min: 8, max: 20 })
    .withMessage('Phone must be 8–20 characters'),
  body('roleCode').optional().trim().notEmpty().withMessage('Role code required'),
];

export const updateUserStatusRules = [
  param('uuid').isUUID().withMessage('Valid user uuid required'),
  body('status').isIn(['pending', 'active', 'suspended', 'banned']).withMessage('Invalid status'),
];

export const adminResetPasswordRules = [
  param('uuid').isUUID().withMessage('Valid user uuid required'),
  passwordFieldRules,
];
