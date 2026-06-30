import { authenticate, authorize } from '@common/middleware/auth.middleware';
import { UserRole } from '@common/types';
import { Router } from 'express';
import { notificationController } from '../controllers/notification.controller';

const router = Router();

router.use(authenticate);

/**
 * GET /sse-notifications
 *
 * Opens an SSE stream that polls active booking statuses every 5 seconds
 * and pushes them to the connected client.
 *
 * - STAFF / ADMIN  → bookings filtered by their branch_id
 * - BOSS           → all active bookings (no branch filter)
 * - CUSTOMER       → only their own bookings
 */
router.get(
  '/',
  authorize(UserRole.CUSTOMER, UserRole.STAFF, UserRole.ADMIN, UserRole.BOSS),
  notificationController.getWashingStatus
);

export default router;