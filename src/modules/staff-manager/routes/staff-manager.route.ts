import { Router } from 'express';
import { staffAbsentRequestController } from '../controllers/staff-manager.controller';
import { authenticate, authorize } from '../../../common/middleware/auth.middleware';
import { UserRole } from '../../../common/types/enum';
import { createStaffAbsentRequestSchema, getStaffOffSchema, reviewStaffAbsentRequestSchema } from '../dto/staff-manager.dto';
import { validate } from '@common/middleware/validate.middleware';

const router = Router();

// ─── STAFF ───────────────────────────────

// tạo đơn nghỉ
router.post(
  '/',
  authenticate,
  authorize(UserRole.STAFF),
  validate(createStaffAbsentRequestSchema),
  staffAbsentRequestController.createRequest,
);

// xem đơn của mình
router.get(
  '/me',
  authenticate,
  authorize(UserRole.STAFF),
  staffAbsentRequestController.getMyRequests,
);

// ─── MANAGER ────────────────────────────

// xem danh sách đơn chờ duyệt
router.get(
  '/pending',
  authenticate,
  authorize(UserRole.STAFF),
  staffAbsentRequestController.getPendingRequests,
);

// duyệt / từ chối đơn
router.patch(
  '/:requestId/review',
  authenticate,
  authorize(UserRole.STAFF),
  validate(reviewStaffAbsentRequestSchema),
  staffAbsentRequestController.reviewRequest,
);

router.get(
    '/staff-off',
    authenticate,
    authorize(UserRole.STAFF),
    validate(getStaffOffSchema, 'query'),
    staffAbsentRequestController.getStaffOff,
);

export default router;