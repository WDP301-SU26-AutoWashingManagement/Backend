import { Router } from 'express';
import { vehicleClassController } from '../controllers/vehicleClass.controller';
import { validate } from '../../../common/middleware/validate.middleware';
import {
    createVehicleClassSchema,
    updateVehicleClassSchema,
} from '../dtos/vehicleClass.dto';
import {
    authenticate,
    authorize,
} from '../../../common/middleware/auth.middleware';
import { UserRole } from '../../../common/types/enum';

const router = Router();
const controller = vehicleClassController;

router.post(
    '/',
    authenticate,
    authorize(UserRole.ADMIN),
    validate(createVehicleClassSchema),
    controller.create
);

router.get(
    '/',
    controller.getAll
);

router.get(
    '/:id',
    controller.getById
);

router.put(
    '/:id',
    authenticate,
    authorize(UserRole.ADMIN),
    validate(updateVehicleClassSchema),
    controller.update
);

router.delete(
    '/:id',
    authenticate,
    authorize(UserRole.ADMIN),
    controller.delete
);

export default router;