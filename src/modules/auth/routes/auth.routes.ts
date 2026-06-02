import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { passwordController } from '../controllers/password.controller';
import { validate } from '../../../common/middleware/validate.middleware';
import { registerSchema, loginSchema, googleLoginSchema } from '../dtos/auth.dto';
import { authorize, authenticate } from '../../../common/middleware/auth.middleware';
import {
  forgotPasswordSchema,
  verifyOtpSchema,
  resetPasswordSchema,
} from '../dtos/password.dto';
import { UserRole } from '../../../common/types/enum';

const router = Router();

// ─── Auth ────────────────────────────────────────────────────────────────────
router.post('/register', authenticate, authorize(UserRole.ADMIN, UserRole.BOSS), validate(registerSchema, 'body'), authController.register);
router.post('/login', validate(loginSchema, 'body'), authController.login);
router.post('/google', validate(googleLoginSchema, 'body'), authController.googleLogin);
router.post('/google/code', authController.googleCode);
router.post('/refresh', authController.refreshToken);

// ─── Password (public — không cần token) ─────────────────────────────────────
router.post('/forgot-password', validate(forgotPasswordSchema, 'body'), passwordController.forgotPassword);
router.post('/verify-otp',      validate(verifyOtpSchema, 'body'),      passwordController.verifyOtp);
router.post('/reset-password',  validate(resetPasswordSchema, 'body'),  passwordController.resetPassword);

export default router;