import { Router } from 'express';
import { vehicleController, VehicleController } from '../controllers/vehicle.controller';
import { validate } from '../../../common/middleware/validate.middleware';
import { createVehicleSchema, updateVehicleSchema } from '../dtos/vehicle.dto';

const router = Router();
const controller = vehicleController;

router.post('/', validate(createVehicleSchema), controller.create);
router.get('/', controller.getAll);
router.get('/:id', controller.getById);
router.put('/:id', validate(updateVehicleSchema), controller.update);
router.delete('/:id', controller.delete);

export default router;
