import Joi from 'joi';
import { BookingSource, BookingStatus } from '../../../models/appointment.model';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const mongoId = Joi.string()
  .pattern(/^[a-f\d]{24}$/i)
  .messages({ 'string.pattern.base': '{{#label}} must be a valid MongoDB ObjectId' });

// ─── Sub-schemas ──────────────────────────────────────────────────────────────

const bookingServiceItemSchema = Joi.object({
  service_id: mongoId.required().messages({
    'any.required': 'service_id is required',
  }),
  service_package_id: mongoId.optional(),
});

// ─── Exported schemas ─────────────────────────────────────────────────────────

/**
 * POST /bookings
 * Customer tạo booking mới.
 */
export const createBookingSchema = Joi.object({
  branch_id: mongoId.required().messages({
    'any.required': 'branch_id is required',
  }),

  vehicle_id: mongoId.required().messages({
    'any.required': 'vehicle_id is required',
  }),

  scheduled_at: Joi.string()
    .isoDate()
    .required()
    .messages({
      'string.isoDate': 'scheduled_at must be a valid ISO 8601 date',
      'any.required'  : 'scheduled_at is required',
    }),

  services: Joi.array()
    .items(bookingServiceItemSchema)
    .min(1)
    .required()
    .messages({
      'array.min'   : 'At least one service is required',
      'any.required': 'services is required',
    }),

  booking_source: Joi.string()
    .valid(...Object.values(BookingSource))
    .default(BookingSource.APP),
});

/**
 * GET /bookings — query params
 */
export const getBookingListSchema = Joi.object({
  page  : Joi.number().integer().min(1).default(1),
  limit : Joi.number().integer().min(1).max(100).default(10),

  branch_id   : mongoId.optional(),
  customer_id : mongoId.optional(),
  staff_id    : mongoId.optional(),

  booking_status: Joi.string()
    .valid(...Object.values(BookingStatus))
    .optional(),

  from_date: Joi.string().isoDate().optional(),
  to_date  : Joi.string().isoDate().optional(),
  time_slot: Joi.string().optional(),
});

/**
 * GET /branches/:id/available-slots — query params
 */
export const availableSlotsSchema = Joi.object({
  date: Joi.string()
    .pattern(/^\d{4}-\d{2}-\d{2}$/)
    .required()
    .messages({
      'string.pattern.base': 'date must be in YYYY-MM-DD format',
      'any.required'       : 'date is required',
    }),

  service_ids: Joi.alternatives()
    .try(
      Joi.array().items(mongoId).min(1),
      mongoId,  // single id as string
    )
    .optional(),
});

/**
 * PATCH /bookings/:id/confirm
 */
export const confirmBookingSchema = Joi.object({
  staff_id: mongoId.optional(),
});

/**
 * POST /bookings/:id/assign-staff
 */
export const assignStaffSchema = Joi.object({
  staff_id: mongoId.required().messages({
    'any.required': 'staff_id is required',
  }),
});

/**
 * PATCH /bookings/:id/cancel
 */
export const cancelBookingSchema = Joi.object({
  cancellation_reason: Joi.string().trim().min(5).max(500).required().messages({
    'string.min'  : 'cancellation_reason must be at least 5 characters',
    'any.required': 'cancellation_reason is required',
  }),
});