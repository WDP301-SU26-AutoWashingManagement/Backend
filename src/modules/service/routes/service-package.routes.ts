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

const router = Router();

// ─── Public ───────────────────────────────────────────────────────────────────
router.get('/',    validate(getServicePackageListSchema, 'query'), servicePackageController.getList);
router.get('/:id',                                                 servicePackageController.getById);

// ─── Admin only ───────────────────────────────────────────────────────────────
router.post(  '/',                  authenticate, authorize('admin'), validate(createServicePackageSchema), servicePackageController.create);
router.patch( '/:id',               authenticate, authorize('admin'), validate(updateServicePackageSchema), servicePackageController.update);
router.patch( '/:id/toggle-active', authenticate, authorize('admin'), validate(toggleActiveSchema),         servicePackageController.toggleActive);
router.delete('/:id',               authenticate, authorize('admin'),                                        servicePackageController.remove);

export default router;