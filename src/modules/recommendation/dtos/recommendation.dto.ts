import Joi from 'joi';

const mongoId = Joi.string()
  .pattern(/^[a-f\d]{24}$/i)
  .messages({ 'string.pattern.base': '{{#label}} must be a valid MongoDB ObjectId' });

/**
 * GET /bookings/recommendation — query params
 */
export const getBookingRecommendationSchema = Joi.object({
  vehicle_id: mongoId.required().messages({
    'any.required': 'vehicle_id is required',
  }),
  branch_id: mongoId.optional(),
});
