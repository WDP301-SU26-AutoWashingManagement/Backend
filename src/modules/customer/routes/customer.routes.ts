import { Router } from 'express';
import { customerController, CustomerController } from '../controllers/customer.controller';
import { authenticate, authorize } from '../../../common/middleware/auth.middleware';
import { validate } from '../../../common/middleware/validate.middleware';
import { updateProfileSchema, changePasswordSchema } from '../dtos/customer.dto';

const router = Router();
const controller = customerController

router.get(
    '/profile',
    authenticate,
    // authorize('customer'),
    controller.getProfile
);

router.put(
    '/profile',
    authenticate,
    authorize('customer'),
    validate(updateProfileSchema, 'body'),
    controller.updateProfile
);

router.patch(
    '/profile/password',
    authenticate,
    authorize('customer'),
    validate(changePasswordSchema, 'body'),
    controller.changePassword
);

export default router;
