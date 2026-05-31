import { Router } from 'express';
import { serviceGroupController } from '../controllers/serviceGroup.controller';
import { authenticate, authorize } from '../../../common/middleware/auth.middleware';
import { validate } from '../../../common/middleware/validate.middleware';
import {
    createServiceGroupSchema,
    updateServiceGroupSchema,
    toggleActiveSchema,
    getServiceGroupListSchema,
} from '../dtos/serviceGroup.dto';
import { UserRole } from '../../../common/types/enum';

const router = Router();
// router.use(authenticate);

// ─── Public ───────────────────────────────────────────────────────────────────
router.get('/', validate(getServiceGroupListSchema, 'query'), serviceGroupController.getList);
router.get('/:id', serviceGroupController.getById);

// ─── Admin only ───────────────────────────────────────────────────────────────
router.post(  '/', authenticate, authorize(UserRole.ADMIN), validate(createServiceGroupSchema, 'body'), serviceGroupController.create);
router.patch( '/:id', authenticate, authorize(UserRole.ADMIN), validate(updateServiceGroupSchema), serviceGroupController.update);
router.patch( '/:id/toggle-active', authenticate, authorize(UserRole.ADMIN), validate(toggleActiveSchema), serviceGroupController.toggleActive);
router.delete('/:id', authenticate, authorize(UserRole.ADMIN), serviceGroupController.remove);

export default router;