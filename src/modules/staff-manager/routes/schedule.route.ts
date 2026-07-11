import { Router } from 'express';
import { authenticate, authorize } from '../../../common/middleware/auth.middleware';
import { UserRole } from '../../../common/types/enum';
import { validate } from '@common/middleware/validate.middleware';
import { scheduleController } from '../controllers/schedule.controller';
import {addStaffToScheduleSchema, switchStaffSchema} from '../middlewares/schedule.middleware'
const router = Router();

// ─── PUBLIC ROUTES ───────────────────────────────

// Apply authentication middleware to all routes
router.use(authenticate);

/**
 * GET /api/schedules
 * Get all schedules
 * Accessible by: STAFF, ADMIN
 */
router.get(
  '/',
  authorize(UserRole.STAFF, UserRole.ADMIN),
  scheduleController.getAllSchedules
);

/**
 * GET /api/schedules/cron-logs
 * Get recent cron logs
 * Accessible by: STAFF, ADMIN
 */
router.get(
  '/cron-logs',
  authorize(UserRole.STAFF, UserRole.ADMIN),
  scheduleController.getCronLogs
);

/**
 * GET /api/schedules/:id
 * Get schedule by ID
 * Accessible by: STAFF, ADMIN
 */
router.get(
  '/:id',
  authorize(UserRole.STAFF, UserRole.ADMIN),
  scheduleController.getScheduleById
);

// ─── MANAGER ROUTES ───────────────────────────────

/**
 * POST /api/schedules/:scheduleId/add-staff
 * Add staff to schedule
 * Người thực hiện: Manager
 * Điều kiện: Số lượng staff chưa đủ max_staff
 * Tự động: Gửi email thông báo cho staff
 * 
 * Body:
 * {
 *   "staff_id": "string"
 * }
 */
router.post(
  '/:scheduleId/add-staff',
  authorize(UserRole.STAFF), // STAFF role có chứa MANAGER
//   validate(addStaffToScheduleSchema, 'body'),
  scheduleController.addStaffToSchedule
);

/**
 * POST /api/schedules/:scheduleId/replace-staff
 * Replace one staff with another in a schedule
 * Người thực hiện: Manager
 * 
 * Body:
 * {
 *   "old_staff_id": "string",
 *   "new_staff_id": "string"
 * }
 */
router.post(
  '/:scheduleId/replace-staff',
  authorize(UserRole.STAFF),
  scheduleController.replaceStaff
);

/**
 * PUT /api/schedules/:scheduleId/staff
 * Bulk update staff list for a schedule
 * Người thực hiện: Manager
 * 
 * Body:
 * {
 *   "staff_ids": ["string"]
 * }
 */
router.put(
  '/:scheduleId/staff',
  authorize(UserRole.STAFF),
  scheduleController.updateScheduleStaff
);

/**
 * POST /api/schedules/switch-staff
 * Switch two staff in different schedules
 * Người thực hiện: Manager
 * Tự động: Gửi email thông báo cho cả 2 staff
 * 
 * Body:
 * {
 *   "schedule_id_1": "string",
 *   "staff_id_1": "string",
 *   "schedule_id_2": "string",
 *   "staff_id_2": "string"
 * }
 */
router.post(
  '/switch-staff',
  authorize(UserRole.STAFF), // STAFF role có chứa MANAGER
  validate(switchStaffSchema),
  scheduleController.switchStaff
);

/**
 * GET /api/schedules/:staffId/leave-days
 * Get total leave days for a staff
 * Người thực hiện: Manager
 * 
 * Returns:
 * {
 *   "staff_id": "string",
 *   "staff_code": "string",
 *   "annual_leave_days": number,
 *   "used_leave_days": number,
 *   "available_leave_days": number
 * }
 */
router.get(
  '/:staffId/leave-days',
  authorize(UserRole.STAFF), // STAFF role có chứa MANAGER
  scheduleController.getTotalLeaveDays
);

export default router;