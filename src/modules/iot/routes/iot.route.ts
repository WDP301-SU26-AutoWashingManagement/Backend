import { Router } from "express";
import { iotController } from "../controllers/iot.controller";
import { authenticate, authorize } from "@common/middleware/auth.middleware";
import { UserRole } from "@common/types";

const router = Router();

router.use(authenticate);
router.use(authorize(UserRole.ADMIN));

router.get('/', iotController.turnOnWater)

export default router