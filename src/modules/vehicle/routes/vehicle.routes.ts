import { Router } from 'express';
import { vehicleController, VehicleController } from '../controllers/vehicle.controller';
import { validate } from '../../../common/middleware/validate.middleware';
import { createVehicleSchema, updateVehicleSchema } from '../dtos/vehicle.dto';
import { authenticate, authorize} from '../../../common/middleware/auth.middleware';
import { UserRole } from '@common/types';
const router = Router();
const controller = vehicleController;

router.use(authenticate);

router.post('/', authorize(UserRole.CUSTOMER), validate(createVehicleSchema), controller.create);
router.get('/', authorize(UserRole.CUSTOMER), controller.getAll);
router.get('/:id', authorize(UserRole.CUSTOMER), controller.getById);
router.put('/:id', authorize(UserRole.CUSTOMER), validate(updateVehicleSchema), controller.update);
router.delete('/:id', authorize(UserRole.CUSTOMER), controller.delete);

export default router;
