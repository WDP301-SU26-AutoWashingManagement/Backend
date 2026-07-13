import { Router } from 'express';
import { authenticate, authorize } from '../../../common/middleware/auth.middleware';
import { UserRole } from '../../../common/types/enum';
import { attendanceController } from '../controllers/attendance.controller';

const router = Router();

router.use(authenticate);

/**
 * POST /api/attendance/check-in
 * Check-in cho một ca làm việc
 * Người thực hiện: Staff
 * Body: { "schedule_id": "string" }
 */
router.post(
  '/check-in',
  authorize(UserRole.STAFF),
  attendanceController.checkIn
);

/**
 * POST /api/attendance/check-out
 * Check-out cho một ca làm việc
 * Người thực hiện: Staff
 * Body: { "schedule_id": "string" }
 */
router.post(
  '/check-out',
  authorize(UserRole.STAFF),
  attendanceController.checkOut
);

/**
 * GET /api/attendance/me
 * Lấy lịch sử chấm công của bản thân
 * Người thực hiện: Staff
 */
router.get(
  '/me',
  authorize(UserRole.STAFF, UserRole.ADMIN),
  attendanceController.getMyAttendance
);

/**
 * GET /api/attendance/schedule/:scheduleId
 * Lấy danh sách chấm công theo ca
 * Người thực hiện: Manager
 */
router.get(
  '/schedule/:scheduleId',
  authorize(UserRole.STAFF, UserRole.ADMIN),
  attendanceController.getBySchedule
);

/**
 * GET /api/attendance/branch/:branchId
 * Lấy danh sách chấm công theo chi nhánh
 * Người thực hiện: Manager/Admin
 */
router.get(
  '/branch/:branchId',
  authorize(UserRole.STAFF, UserRole.ADMIN),
  attendanceController.getByBranch
);

export default router;