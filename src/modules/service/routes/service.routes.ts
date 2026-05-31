import { Router } from 'express';
import { serviceController } from '../controllers/service.controller';
import { authenticate, authorize } from '../../../common/middleware/auth.middleware';
import { validate } from '../../../common/middleware/validate.middleware';
import {
    createServiceSchema,
    updateServiceSchema,
    toggleActiveSchema,
    getServiceListSchema,
} from '../dtos/service.dto';
import { UserRole } from '../../../common/types/enum';

const router = Router();
// router.use(authenticate);

// ─── Public ───────────────────────────────────────────────────────────────────
router.get('/', validate(getServiceListSchema, 'query'), serviceController.getList);
router.get('/:id', serviceController.getById);

// ─── Admin only ───────────────────────────────────────────────────────────────
router.post(  '/', authenticate, authorize(UserRole.ADMIN), validate(createServiceSchema, 'body'), serviceController.create);
router.patch( '/:id', authenticate, authorize(UserRole.ADMIN), validate(updateServiceSchema), serviceController.update);
router.patch( '/:id/toggle-active', authenticate, authorize(UserRole.ADMIN), validate(toggleActiveSchema), serviceController.toggleActive);
router.delete('/:id', authenticate, authorize(UserRole.ADMIN), serviceController.remove);

export default router;