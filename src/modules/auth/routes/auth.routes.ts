import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { validate } from '../../../common/middleware/validate.middleware';
import { registerSchema, loginSchema, googleLoginSchema } from '../dtos/auth.dto';

const router = Router();

router.post('/register', validate(registerSchema, 'body'), AuthController.register);
router.post('/login', validate(loginSchema, 'body'), AuthController.login);
router.post('/google', validate(googleLoginSchema, 'body'), AuthController.googleLogin);
router.post('/google/code', AuthController.googleCode);
router.post('/refresh', AuthController.refreshToken);

export default router;