import { Router } from 'express';
import { adminController } from '../controllers/admin.controller';
import { authenticate, authorize } from '../../../common/middleware/auth.middleware';
import { UserRole } from '../../../common/types/enum';
import { validate } from '@common/middleware/validate.middleware';
import { updateAdminSchema } from '../dtos/admin.dto';

const router = Router();

// All admin routes require authentication + admin role
router.use(authenticate);

// ─── Dashboard stats ──────────────────────────────────────────────────────────
router.get('/customers/count', authorize(UserRole.ADMIN, UserRole.BOSS, UserRole.STAFF), adminController.getCustomerCount);
router.post('/bookings/count', authorize(UserRole.ADMIN, UserRole.BOSS, UserRole.STAFF), adminController.getBookingCount);
router.post('/bookings/hourly-distribution', authorize(UserRole.ADMIN, UserRole.BOSS, UserRole.STAFF), adminController.getHourlyBookingDistribution);
router.post('/profit', authorize(UserRole.ADMIN, UserRole.BOSS, UserRole.STAFF), adminController.getDailyProfit);
router.get('/top-services', authorize(UserRole.ADMIN, UserRole.BOSS, UserRole.STAFF), adminController.getTopServices);
router.get('/top-services-revenue', authorize(UserRole.ADMIN, UserRole.BOSS, UserRole.STAFF), adminController.getTopServicesByRevenue);
router.get('/top-individual-services', authorize(UserRole.ADMIN, UserRole.BOSS, UserRole.STAFF), adminController.getTopIndividualServices);
router.get('/top-individual-services-revenue', authorize(UserRole.ADMIN, UserRole.BOSS, UserRole.STAFF), adminController.getTopIndividualServicesByRevenue);


router.get(
    "/",
    authorize(UserRole.BOSS),
    adminController.getAdmins,
);
 
router.get(
    "/:id",
    authorize(UserRole.BOSS),
    adminController.getAdmin,
);
 
router.patch(
    "/:id",
    authorize(UserRole.BOSS),
    validate(updateAdminSchema),
    adminController.updateAdmin,
);
 
router.delete(
    "/:id",
    authorize(UserRole.BOSS),
    adminController.deleteAdmin,
);
export default router;