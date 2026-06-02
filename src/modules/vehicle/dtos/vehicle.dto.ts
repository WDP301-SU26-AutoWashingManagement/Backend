import Joi from 'joi';

export const createVehicleSchema = Joi.object({
  customer_id: Joi.string()
    .regex(/^[0-9a-fA-F]{24}$/)
    .required(),

  vehicle_class_id: Joi.string()
    .regex(/^[0-9a-fA-F]{24}$/)
    .required(),

  license_plate: Joi.string().trim().required(),

  fuel_type: Joi.string().trim().required(),

  color: Joi.string().trim().optional(),
});

export const updateVehicleSchema = Joi.object({
  vehicle_class_id: Joi.string()
    .regex(/^[0-9a-fA-F]{24}$/)
    .optional(),

  license_plate: Joi.string().trim().optional(),

  fuel_type: Joi.string().trim().optional(),

  color: Joi.string().trim().optional(),
});