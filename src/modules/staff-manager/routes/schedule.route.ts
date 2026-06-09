import { Router } from 'express';
import { authenticate, authorize } from '../../../common/middleware/auth.middleware';
import { UserRole } from '../../../common/types/enum';
import { validate } from '@common/middleware/validate.middleware';
import { scheduleController } from '../controllers/schedule.controller';

const router = Router();

router.use(authenticate);

router.get("/schedules", authorize(UserRole.STAFF, UserRole.ADMIN), scheduleController.getAllSchedules);
router.get("/schedules/:id", authorize(UserRole.STAFF, UserRole.ADMIN), scheduleController.getScheduleById);

export default router;