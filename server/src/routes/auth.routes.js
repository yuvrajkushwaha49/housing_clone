import { Router } from 'express';
import * as authController from '../controllers/auth.controller.js';
import { authenticate } from '../middlewares/authenticate.js';
import {
  changePasswordRules,
  forgotPasswordRules,
  loginRules,
  otpRequestRules,
  otpVerifyRules,
  registerRules,
  resetPasswordRules,
  validate,
} from '../validators/auth.validator.js';
import { body } from 'express-validator';

const router = Router();

router.post('/register', registerRules, validate, authController.register);
router.post('/login', loginRules, validate, authController.login);
router.post('/refresh', authController.refresh);
router.post('/logout', authController.logout);
router.get('/me', authenticate, authController.me);

router.post(
  '/verify-email',
  body('token').notEmpty(),
  validate,
  authController.verifyEmail
);
router.post(
  '/resend-verification',
  body('email').isEmail().normalizeEmail(),
  validate,
  authController.resendVerification
);
router.post('/forgot-password', forgotPasswordRules, validate, authController.forgotPassword);
router.post('/reset-password', resetPasswordRules, validate, authController.resetPassword);
router.post(
  '/change-password',
  authenticate,
  changePasswordRules,
  validate,
  authController.changePassword
);
router.post('/otp/request', otpRequestRules, validate, authController.requestOtp);
router.post('/otp/verify', otpVerifyRules, validate, authController.verifyOtp);

export default router;
