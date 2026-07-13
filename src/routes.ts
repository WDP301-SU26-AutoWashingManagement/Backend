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
import staffAbsentRoutes from './modules/staff-manager/routes/staff-manager.route'
import scheduleRoutes from './modules/staff-manager/routes/schedule.route'
import iotRoutes from './modules/iot/routes/iot.route';
import customerRoutes from './modules/customer/routes/customer.routes';
import adminRoutes from './modules/admin/routes/admin.route';
import bookingRoutes from './modules/booking/routes/booking.route'
import recommendationRoutes from './modules/recommendation/routes/recommendation.route';
import invoiceRoutes from './modules/invoice/routes/invoice.routes';
import promotionRoutes from './modules/promotion/routes/promotion.route';
import staffRoutes from './modules/staff-manager/routes/staff.route';
import bookingChecklistRoutes from './modules/booking-checklist/routes/bookingChecklist.route';
import checkinRoutes from './modules/check-in/routes/checkin.route';
import sseNotificationRoutes from './modules/sse-notifications/routes/notification.route';
import attendanceRoute from './modules/staff-manager/routes/attendance.route';

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
router.use('/staff-absent', staffAbsentRoutes);
router.use('/staff', staffRoutes);
router.use('/schedule', scheduleRoutes);
router.use('/wash', iotRoutes);
router.use('/customers', customerRoutes);
router.use('/admin', adminRoutes);
router.use('/checkin', checkinRoutes);
// "Auto-Pilot Booking" — phải mount TRƯỚC /bookings vì booking.route.ts có GET /:id
// sẽ nuốt mất /bookings/recommendation nếu đăng ký sau.
router.use('/bookings/recommendation', recommendationRoutes);
router.use('/bookings', bookingRoutes);
router.use('/invoices', invoiceRoutes);
router.use('/promotions', promotionRoutes);
router.use('/booking-checklists', bookingChecklistRoutes);
router.use('/sse-notifications', sseNotificationRoutes);
router.use('/attendance', attendanceRoute)
// router.use('/bookings', bookingRoutes);
// router.use('/services', serviceRoutes);
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