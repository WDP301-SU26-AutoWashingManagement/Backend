import { Router } from "express";
import { authenticate, authorize } from "@common/middleware/auth.middleware";
import { UserRole } from "@common/types/enum";
import { iotController } from "../controllers/iot.controller";

const router = Router();

router.use(authenticate);
router.use(authorize(UserRole.ADMIN, UserRole.BOSS, UserRole.STAFF));

router.post('/', iotController.turnOnWater)

export default router