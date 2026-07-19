import { Router } from 'express';
import { bookingController }    from '../controllers/booking.controller';
import { authenticate, authorize } from '../../../common/middleware/auth.middleware';
import { validate }             from '../../../common/middleware/validate.middleware';
import { UserRole }             from '../../../common/types/enum';
import {
  availableSlotsSchema,
  createBookingSchema,
  getBookingListSchema,
  cancelBookingSchema,
} from '../dtos/booking.dto';

const router = Router();
const ctrl   = bookingController;

// ─── All routes require authentication ────────────────────────────────────────
router.use(authenticate);

// ─── Available Slots (mounted on /branches/:id/available-slots in app router)
// This route lives here for co-location; the app router will mount it correctly.
// Route: GET /branches/:id/available-slots
router.get(
  '/branches/:id/available-slots',
  authorize(UserRole.CUSTOMER, UserRole.STAFF, UserRole.ADMIN, UserRole.BOSS),
  validate(availableSlotsSchema, 'query'),
  ctrl.getAvailableSlots,
);

// ─── Booking CRUD ─────────────────────────────────────────────────────────────

/**
 * POST /bookings
 * Customer tạo booking. Chỉ CUSTOMER được tạo.
 */
router.post(
  '/',
  authorize(UserRole.CUSTOMER),
  validate(createBookingSchema, 'body'),
  ctrl.create,
);

/**
 * GET /bookings
 * Customer thấy booking của mình; Staff/Admin/Boss thấy all (filter by query).
 */
router.get(
  '/',
  authorize(UserRole.CUSTOMER, UserRole.STAFF, UserRole.ADMIN, UserRole.BOSS),
  validate(getBookingListSchema, 'query'),
  ctrl.getList,
);

/**
 * GET /bookings/:id
 * Customer thấy booking của mình; Staff/Admin/Boss thấy any.
 */
router.get(
  '/:id',
  authorize(UserRole.CUSTOMER, UserRole.STAFF, UserRole.ADMIN, UserRole.BOSS),
  ctrl.getById,
);

// ─── State Transitions ────────────────────────────────────────────────────────

/**
 * PATCH /bookings/:id/confirm
 * Staff/Manager/Admin xác nhận booking PENDING → CONFIRMED.
 */
router.patch(
  '/:id/confirm',
  authorize(UserRole.STAFF, UserRole.ADMIN, UserRole.BOSS),
  ctrl.confirm,
);

/**
 * PATCH /bookings/:id/cancel
 * Customer huỷ booking của mình; Staff/Admin huỷ bất kỳ.
 * PENDING | CONFIRMED → CANCELLED.
 */
router.patch(
  '/:id/cancel',
  authorize(UserRole.CUSTOMER, UserRole.STAFF, UserRole.ADMIN, UserRole.BOSS),
  validate(cancelBookingSchema, 'body'),
  ctrl.cancel,
);

/**
 * PATCH /bookings/:id/checkin
 * Staff/Admin check-in khi xe đến nơi. CONFIRMED → CHECKED_IN.
 */
router.patch(
  '/:id/checkin',
  authorize(UserRole.STAFF, UserRole.ADMIN, UserRole.BOSS),
  ctrl.checkin,
);

/**
 * PATCH /bookings/:id/start
 * Staff bắt đầu rửa xe + IoT bơm nước.
 */
router.patch(
  '/:id/start',
  authorize(UserRole.STAFF, UserRole.ADMIN, UserRole.BOSS),
  ctrl.startService,
);

/**
 * PATCH /bookings/:id/washed
 * Staff đánh dấu rửa xong, chuẩn bị thanh toán. IN_PROGRESS -> WASHED.
 */
router.patch(
  '/:id/washed',
  authorize(UserRole.STAFF, UserRole.ADMIN, UserRole.BOSS),
  ctrl.washed,
);

/**
 * PATCH /bookings/:id/complete
 * Staff đánh dấu hoàn thành, tính điểm. WASHED → COMPLETED.
 */
router.patch(
  '/:id/complete',
  authorize(UserRole.STAFF, UserRole.ADMIN, UserRole.BOSS),
  ctrl.complete,
);

/**
 * PATCH /bookings/:id/items/:itemId/toggle
 * Staff/Admin toggles a service item completion status
 */
router.patch(
  '/:id/items/:itemId/toggle',
  authorize(UserRole.STAFF, UserRole.ADMIN, UserRole.BOSS),
  ctrl.toggleServiceStatus,
);

export default router;