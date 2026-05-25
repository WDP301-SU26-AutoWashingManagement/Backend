// booking.routes.ts

import { Router } from 'express';
import { bookingController } from '../controllers/booking.controller';
import { validate } from '../../../common/middleware/validate.middleware';
import {
    createBookingSchema,
    cancelBookingSchema,
    getBookingListSchema,
    findByPlateNumberSchema,
} from '../dtos/booking.dto';
import { authenticate } from '../../../common/middleware/auth.middleware';
import { authorize } from '../../../common/middleware/auth.middleware';
import { UserRole } from '@common/types';
import { validatePromotionForBooking } from '../middlewares/promotion-validate.middleware';
import { validateServicePackageForBooking } from '../middlewares/servicePackage-validate.middleware';

const router = Router();

router.use(authenticate);

// Customer
router.post('/', authorize(UserRole.CUSTOMER), validate(createBookingSchema), validatePromotionForBooking, validateServicePackageForBooking, bookingController.create);
router.patch('/:id/cancel', authorize(UserRole.CUSTOMER), validate(cancelBookingSchema), bookingController.cancel);
router.get('/', authorize(UserRole.CUSTOMER), validate(getBookingListSchema, 'query'), bookingController.getHistory);
router.get('/:id', authorize(UserRole.CUSTOMER), bookingController.getById);


// Staff
router.patch('/:id/check-in',       authorize(UserRole.STAFF),      bookingController.checkIn);
router.patch('/:id/start',          authorize(UserRole.STAFF),      bookingController.startWashing);
router.patch('/:id/complete',       authorize(UserRole.STAFF),      bookingController.complete);

// Gate scanner
router.post('/check-in/plate',      validate(findByPlateNumberSchema), bookingController.checkInByPlate);

export default router;