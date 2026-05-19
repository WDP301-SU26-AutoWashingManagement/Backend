import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { PasswordController } from '../controllers/password.controller';
import { validate } from '../../../common/middleware/validate.middleware';
import { authenticate } from '../../../common/middleware/auth.middleware';
import { registerSchema, loginSchema, adminLoginSchema, googleLoginSchema } from '../dtos/auth.dto';
import {
  forgotPasswordSchema,
  verifyOtpSchema,
  resetPasswordSchema,
  changePasswordSchema,
} from '../dtos/password.dto';

const router = Router();

// ─── Auth ────────────────────────────────────────────────────────────────────
router.post('/register',      validate(registerSchema, 'body'),      AuthController.register);
router.post('/login',         validate(loginSchema, 'body'),         AuthController.login);
router.post('/admin/login',   validate(adminLoginSchema, 'body'),    AuthController.adminLogin);
router.post('/google',        validate(googleLoginSchema, 'body'),   AuthController.googleLogin);
router.post('/google/code',                                          AuthController.googleCode);
router.post('/refresh',                                              AuthController.refreshToken);

// ─── Password (public — không cần token) ─────────────────────────────────────
router.post('/forgot-password', validate(forgotPasswordSchema, 'body'), PasswordController.forgotPassword);
router.post('/verify-otp',      validate(verifyOtpSchema, 'body'),      PasswordController.verifyOtp);
router.post('/reset-password',  validate(resetPasswordSchema, 'body'),  PasswordController.resetPassword);

// ─── Password (private — cần đăng nhập) ──────────────────────────────────────
router.patch('/change-password', authenticate, validate(changePasswordSchema, 'body'), PasswordController.changePassword);

export default router;