import Joi from 'joi';

export const createVehicleSchema = Joi.object({
  customer_id: Joi.string()
    .regex(/^[0-9a-fA-F]{24}$/)
    .required(),

  vehicle_class_id: Joi.string()
    .regex(/^[0-9a-fA-F]{24}$/)
    .required(),

  model_id: Joi.string()
    .regex(/^[0-9a-fA-F]{24}$/)
    .allow(null, '', 'other')
    .optional(),

  make_name: Joi.string().trim().allow(null, '').optional(),
  model_name: Joi.string().trim().allow(null, '').optional(),

  vehicle_model: Joi.string().trim().allow(null, '').optional(),

  license_plate: Joi.string().trim().required(),

  fuel_type: Joi.string().trim().required(),

  color: Joi.string().trim().required(),
});

export const updateVehicleSchema = Joi.object({
  vehicle_class_id: Joi.string()
    .regex(/^[0-9a-fA-F]{24}$/)
    .optional(),

  model_id: Joi.string()
    .regex(/^[0-9a-fA-F]{24}$/)
    .allow(null, '', 'other')
    .optional(),

  make_name: Joi.string().trim().allow(null, '').optional(),
  model_name: Joi.string().trim().allow(null, '').optional(),

  vehicle_model: Joi.string().trim().allow(null, '').optional(),

  license_plate: Joi.string().trim().optional(),

  fuel_type: Joi.string().trim().optional(),

  color: Joi.string().trim().optional(),
});