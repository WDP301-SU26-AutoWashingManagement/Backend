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

const router = Router();

router.use(authenticate);

// Customer
router.post('/',                    validate(createBookingSchema),    bookingController.create);
router.patch('/:id/cancel',         validate(cancelBookingSchema),    bookingController.cancel);
router.get('/',                     validate(getBookingListSchema, 'query'), bookingController.getHistory);
router.get('/:id',                                                    bookingController.getById);

// Admin
router.post('/:id/confirm',         authorize('admin'),               bookingController.confirm);

// Staff
router.patch('/:id/check-in',       authorize('admin'),      bookingController.checkIn);
router.patch('/:id/start',          authorize('admin'),      bookingController.startWashing);
router.patch('/:id/complete',       authorize('admin'),      bookingController.complete);

// Gate scanner
router.post('/check-in/plate',      validate(findByPlateNumberSchema), bookingController.checkInByPlate);

export default router;