import { Router } from 'express';
import { servicePackageController } from '../controllers/servicePackage.controller';
import {
    authenticate,
    authorize,
} from '../../../common/middleware/auth.middleware';
import { validate } from '../../../common/middleware/validate.middleware';
import {
    createServicePackageSchema,
    updateServicePackageSchema,
    toggleActiveSchema,
    getServicePackageListSchema,
} from '../dtos/servicePackage.dto';
import { UserRole } from '../../../common/types/enum';

const router = Router();

// ─── Public ───────────────────────────────────────────────────────────────────

router.get(
    '/',
    validate(getServicePackageListSchema, 'query'),
    servicePackageController.getList,
);

router.get(
    '/:id',
    servicePackageController.getById,
);

router.get(
    '/:id/services',
    servicePackageController.listServices,
);

// ─── Admin only ───────────────────────────────────────────────────────────────

router.post(
    '/',
    authenticate,
    authorize(UserRole.ADMIN),
    validate(createServicePackageSchema, 'body'),
    servicePackageController.create,
);

router.patch(
    '/:id',
    authenticate,
    authorize(UserRole.ADMIN),
    validate(updateServicePackageSchema),
    servicePackageController.update,
);

router.patch(
    '/:id/toggle-active',
    authenticate,
    authorize(UserRole.ADMIN),
    validate(toggleActiveSchema),
    servicePackageController.toggleActive,
);

router.delete(
    '/:id',
    authenticate,
    authorize(UserRole.ADMIN),
    servicePackageController.remove,
);

export default router;