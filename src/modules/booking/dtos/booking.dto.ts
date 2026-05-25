// booking.schemas.ts

import Joi from 'joi';
import { BookingStatus } from '../../../models/washBooking.model';

const MONGO_ID_PATTERN = /^[a-f\d]{24}$/i;
const mongoId = () =>
    Joi.string().pattern(MONGO_ID_PATTERN).message('Must be a valid MongoDB ObjectId');

// ─────────────────────────────────────────────
// BookingService.createBooking()
// ─────────────────────────────────────────────
export const createBookingSchema = Joi.object({
    vehicle_id:         mongoId().required(),
    service_package_id: mongoId().required(),
    promotion_id:       mongoId().optional(),
    scheduled_at:       Joi.string().isoDate().required(),
    booking_source:     Joi.string().valid('app', 'web', 'admin').required(),
});

// ─────────────────────────────────────────────
// BookingService.cancelBooking()
// ─────────────────────────────────────────────
export const cancelBookingSchema = Joi.object({
    reason: Joi.string().max(500).required(),
});

// ─────────────────────────────────────────────
// BookingService.getBookingList()
// ─────────────────────────────────────────────
const BOOKING_STATUSES: BookingStatus[] = [
    'pending', 'checked_in', 'in_progress', 'completed', 'cancelled',
];

export const getBookingListSchema = Joi.object({
    page:           Joi.number().integer().min(1).default(1),
    limit:          Joi.number().integer().min(1).default(10),
    customer_id:    mongoId().optional(),
    vehicle_id:     mongoId().optional(),
    booking_status: Joi.string().valid(...BOOKING_STATUSES).optional(),
    scheduled_from: Joi.string().isoDate().optional(),
    scheduled_to:   Joi.string().isoDate().optional(),
});


const UPDATABLE_STATUSES: BookingStatus[] = [
    'checked_in', 'in_progress', 'completed', 'cancelled',
];

export const updateBookingStatusSchema = Joi.object({
    status: Joi.string().valid(...UPDATABLE_STATUSES).required(),
});

// ─────────────────────────────────────────────
// BookingService.findBookingByPlateNumber()
// ─────────────────────────────────────────────
export const findByPlateNumberSchema = Joi.object({
    plate_number: Joi.string().required(),
});