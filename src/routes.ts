import { Router } from 'express';

import authRoutes from './modules/auth/routes/auth.routes';
import userProfileRoutes from './modules/userProfile/routes/userProfile.routes';
import branchRoutes from './modules/boss/routes/branch.route';
import serviceRoutes from './modules/service/routes/service.routes';
import serviceGroupRoutes from './modules/service/routes/serviceGroup.route';
import servicePackageRoutes from './modules/service/routes/servicePackage.route';
import vehicleRoutes from './modules/vehicle/routes/vehicle.routes';
import makeRoutes from './modules/vehicle/routes/make.route';
import vehicleClassRoutes from './modules/vehicle/routes/vehicleClass.route';
import vehicleModelRoutes from './modules/vehicle/routes/vehicleModel.route';
import tierRoutes from './modules/tier/routes/tier.routes';
import iotRoutes from './modules/iot/routes/iot.route';

// import notificationRoutes from './modules/notification/routes/notification.routes';
// import feedbackRoutes from './modules/feedback/routes/feedback.routes';
// import tierRoutes from './modules/tier/routes/tier.routes';
// import auditLogRoutes from './modules/audit-log/routes/audit-log.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/profile', userProfileRoutes);
router.use('/branches', branchRoutes);
router.use('/services', serviceRoutes);
router.use('/service-groups', serviceGroupRoutes);
router.use('/service-packages', servicePackageRoutes);
router.use('/vehicles', vehicleRoutes);
router.use('/makes', makeRoutes);
router.use('/vehicle-classes', vehicleClassRoutes);
router.use('/vehicle-models', vehicleModelRoutes);
router.use('/tiers', tierRoutes);
router.use('/wash', iotRoutes);
// router.use('/admin', adminRoutes);
// router.use('/bookings', bookingRoutes);
// router.use('/services', serviceRoutes);
// router.use('/promotions', promotionRoutes);
// router.use('/vehicles', vehicleRoutes);
// router.use('/users', userRoutes);
// router.use('/bookings', bookingRoutes);
// router.use('/services', serviceRoutes);
// router.use('/promotions', promotionRoutes);
// router.use('/notifications', notificationRoutes);
// router.use('/feedbacks', feedbackRoutes);
// router.use('/tiers', tierRoutes);
// router.use('/audit-logs', auditLogRoutes);

export default router;