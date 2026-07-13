import { Router } from "express";
import { authenticate, authorize } from "@common/middleware/auth.middleware";
import { UserRole } from "@common/types/enum";
import { validate } from '../../../common/middleware/validate.middleware';
import { iotController } from "../controllers/iot.controller";
import { washManualSchema } from "../dtos/iot.dto";

const router = Router();

router.use(authenticate);
router.use(authorize(UserRole.ADMIN, UserRole.BOSS, UserRole.STAFF));

router.post('/manual', validate(washManualSchema), iotController.washManual);
router.post('/stop', iotController.stopWashing)

export default router