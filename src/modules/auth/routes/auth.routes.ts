import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { PasswordController } from '../controllers/password.controller';
import { validate } from '../../../common/middleware/validate.middleware';
import { registerSchema, loginSchema, googleLoginSchema } from '../dtos/auth.dto';
import {
  forgotPasswordSchema,
  verifyOtpSchema,
  resetPasswordSchema,
} from '../dtos/password.dto';

const router = Router();

// ─── Auth ────────────────────────────────────────────────────────────────────
router.post('/register',      validate(registerSchema, 'body'),      AuthController.register);
router.post('/login',         validate(loginSchema, 'body'),         AuthController.login);
router.post('/google',        validate(googleLoginSchema, 'body'),   AuthController.googleLogin);
router.post('/google/code',                                          AuthController.googleCode);
router.post('/refresh',                                              AuthController.refreshToken);

// ─── Password (public — không cần token) ─────────────────────────────────────
router.post('/forgot-password', validate(forgotPasswordSchema, 'body'), PasswordController.forgotPassword);
router.post('/verify-otp',      validate(verifyOtpSchema, 'body'),      PasswordController.verifyOtp);
router.post('/reset-password',  validate(resetPasswordSchema, 'body'),  PasswordController.resetPassword);

export default router;