import { Router } from 'express';
import { AdminController } from '../controllers/admin.controller';
import { validate } from '../../../common/middleware/validate.middleware';
import { authenticate, authorize } from '../../../common/middleware/auth.middleware';
import { createAdminSchema } from '../dtos/admin.dto';

const router = Router();

router.post('/', authenticate, validate(createAdminSchema, 'body'), AdminController.createAdmin);

export default router;

