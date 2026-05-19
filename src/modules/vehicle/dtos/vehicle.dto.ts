import Joi from 'joi';

export const createVehicleSchema = Joi.object({
  customer_id: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required(),
  plate_number: Joi.string().required(),
  brand: Joi.string().required(),
  vehicle_model: Joi.string().required(),
});

export const updateVehicleSchema = Joi.object({
  plate_number: Joi.string().optional(),
  brand: Joi.string().optional(),
  vehicle_model: Joi.string().optional(),
});
