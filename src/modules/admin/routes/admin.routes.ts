import { Router } from 'express';
import { adminController } from '../controllers/admin.controller';
import { authenticate, authorize } from '../../../common/middleware/auth.middleware';
import { UserRole } from '@common/types';

const router = Router();

// All admin routes require authentication + admin role
router.use(authenticate);
router.use(authorize(UserRole.ADMIN));

// ─── Dashboard stats ──────────────────────────────────────────────────────────
router.get('/customers/count', adminController.getCustomerCount);
router.post('/bookings/count', adminController.getBookingCount);
router.get('/profit', adminController.getDailyProfit);
router.get('/top-services', adminController.getTopServices);

export default router;
