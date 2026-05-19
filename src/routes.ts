import { Router } from 'express';

import authRoutes from './modules/auth/routes/auth.routes';
import adminRoutes from './modules/admin/routes/admin.routes';
// import customerRoutes from './modules/customer/routes/customer.routes';
import vehicleRoutes from './modules/vehicle/routes/vehicle.routes';
// import bookingRoutes from './modules/booking/routes/booking.routes';
// import serviceRoutes from './modules/service/routes/service.routes';
// import promotionRoutes from './modules/promotion/routes/promotion.routes';
// import notificationRoutes from './modules/notification/routes/notification.routes';
// import postRoutes from './modules/post/routes/post.routes';
// import feedbackRoutes from './modules/feedback/routes/feedback.routes';
// import tierRoutes from './modules/tier/routes/tier.routes';
// import pointTransactionRoutes from './modules/point-transaction/routes/point-transaction.routes';
// import auditLogRoutes from './modules/audit-log/routes/audit-log.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/admins', adminRoutes);
// router.use('/customers', customerRoutes);
router.use('/vehicles', vehicleRoutes);
// router.use('/bookings', bookingRoutes);
// router.use('/services', serviceRoutes);
// router.use('/promotions', promotionRoutes);
// router.use('/notifications', notificationRoutes);
// router.use('/posts', postRoutes);
// router.use('/feedbacks', feedbackRoutes);
// router.use('/tiers', tierRoutes);
// router.use('/point-transactions', pointTransactionRoutes);
// router.use('/audit-logs', auditLogRoutes);

export default router;