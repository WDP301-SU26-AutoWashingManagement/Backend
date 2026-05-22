import { Router } from 'express';

import authRoutes from './modules/auth/routes/auth.routes';
import bookingRoutes from './modules/booking/routes/booking.routes';
import serviceRoutes from './modules/service/routes/service-package.routes';
import promotionRoutes from './modules/promotion/routes/promotion.routes';
import vehicleRoutes from './modules/vehicle/routes/vehicle.routes';
import userRoutes from './modules/userProfile/routes/userProfile.routes';

// import notificationRoutes from './modules/notification/routes/notification.routes';
// import feedbackRoutes from './modules/feedback/routes/feedback.routes';
// import tierRoutes from './modules/tier/routes/tier.routes';
// import auditLogRoutes from './modules/audit-log/routes/audit-log.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/bookings', bookingRoutes);
router.use('/services', serviceRoutes);
router.use('/promotions', promotionRoutes);
router.use('/vehicles', vehicleRoutes);
router.use('/users', userRoutes);
// router.use('/bookings', bookingRoutes);
// router.use('/services', serviceRoutes);
// router.use('/promotions', promotionRoutes);
// router.use('/notifications', notificationRoutes);
// router.use('/feedbacks', feedbackRoutes);
// router.use('/tiers', tierRoutes);
// router.use('/audit-logs', auditLogRoutes);

export default router;