import { authenticate, authorize } from '@common/middleware/auth.middleware';
import { AuthenticatedRequest, UserRole } from '@common/types';
import { Router, Response, Request } from 'express';
import { notificationService } from '../services/notification.service';
import { User } from '../../../models/user.model';
import { Customer } from '../../../models/customer.model';
import { Types } from 'mongoose';

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
  '/sse-notifications',
  authorize(UserRole.CUSTOMER, UserRole.STAFF, UserRole.ADMIN, UserRole.BOSS),
  async (req: Request, res: Response) => {
    // ── SSE headers ──
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'X-Accel-Buffering': 'no',
    });
    const flushResponse = () => {
      if (typeof (res as any).flush === 'function') {
        (res as any).flush();
      }
    };
    flushResponse();

    const { id: userId, role } = (req as AuthenticatedRequest).user;

    // Resolve filter params based on role
    let branchId: string | undefined;
    let customerId: string | undefined;

    try {
      if (role === UserRole.CUSTOMER) {
        const customer = await Customer.findOne({ user_id: new Types.ObjectId(userId) }).lean();
        if (customer) customerId = (customer._id as Types.ObjectId).toString();
      } else if (role === UserRole.STAFF || role === UserRole.ADMIN) {
        const user = await User.findById(userId).lean();
        if (user?.branch_id) branchId = user.branch_id.toString();
      }
      // BOSS → no filter, sees everything
    } catch (err) {
      console.error('SSE: failed to resolve user context', err);
    }

    // Send initial data immediately
    try {
      const statuses = await notificationService.getActiveBookingStatuses(branchId, customerId);
      res.write(`data: ${JSON.stringify({ type: 'booking_status', data: statuses })}\n\n`);

      if (branchId) {
        const cachedStatus = await notificationService.getStatus(branchId);
        if (cachedStatus) {
          res.write(`data: ${JSON.stringify({ type: 'washing_status', data: JSON.parse(cachedStatus) })}\n\n`);
        } else {
          res.write(`data: ${JSON.stringify({ type: 'washing_status', data: { id: branchId, action: 'PREPAIRING' } })}\n\n`);
        }
      }
      flushResponse();
    } catch (err) {
      console.error('SSE: initial fetch failed', err);
    }

    // Poll every 5 seconds
    const POLL_INTERVAL_MS = 5_000;
    const intervalId = setInterval(async () => {
      try {
        const statuses = await notificationService.getActiveBookingStatuses(branchId, customerId);
        res.write(`data: ${JSON.stringify({ type: 'booking_status', data: statuses })}\n\n`);

        if (branchId) {
          const cachedStatus = await notificationService.getStatus(branchId);
          if (cachedStatus) {
            res.write(`data: ${JSON.stringify({ type: 'washing_status', data: JSON.parse(cachedStatus) })}\n\n`);
          } else {
            res.write(`data: ${JSON.stringify({ type: 'washing_status', data: { id: branchId, action: 'PREPAIRING' } })}\n\n`);
          }
        }
        flushResponse();
      } catch (err) {
        console.error('SSE: poll failed', err);
      }
    }, POLL_INTERVAL_MS);

    // Clean up on disconnect
    req.on('close', () => {
      clearInterval(intervalId);
      console.log('❌ SSE client disconnected');
      res.end();
    });
  },
);

export default router;