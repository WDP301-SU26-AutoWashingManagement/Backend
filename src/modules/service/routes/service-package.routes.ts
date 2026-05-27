import { Router } from 'express';
import { servicePackageController } from '../controllers/service-package.controller';
import { authenticate, authorize } from '../../../common/middleware/auth.middleware';
import { validate } from '../../../common/middleware/validate.middleware';
import {
    createServicePackageSchema,
    updateServicePackageSchema,
    toggleActiveSchema,
    getServicePackageListSchema,
} from '../dtos/service-package.dto';
import { UserRole } from '@common/types';

const router = Router();
// router.use(authenticate);

// ─── Public ───────────────────────────────────────────────────────────────────
router.get('/', validate(getServicePackageListSchema, 'query'), servicePackageController.getList);
router.get('/:id', servicePackageController.getById);

// ─── Admin only ───────────────────────────────────────────────────────────────
router.post(  '/', authenticate, authorize(UserRole.ADMIN), validate(createServicePackageSchema, 'body'), servicePackageController.create);
router.patch( '/:id', authenticate, authorize(UserRole.ADMIN), validate(updateServicePackageSchema), servicePackageController.update);
router.patch( '/:id/toggle-active', authenticate, authorize(UserRole.ADMIN), validate(toggleActiveSchema), servicePackageController.toggleActive);
router.delete('/:id', authenticate, authorize(UserRole.ADMIN), servicePackageController.remove);

export default router;