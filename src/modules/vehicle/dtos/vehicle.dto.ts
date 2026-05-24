//vehicle.dto.ts
import Joi from 'joi';
import { VehicleType } from '../../../models/vehicle.model';

export const createVehicleSchema = Joi.object({
  customer_id: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required(),
  plate_number: Joi.string().required(),
  brand: Joi.string().required(),
  vehicle_model: Joi.string().required(),
  vehicle_type: Joi.string().valid(...Object.values(VehicleType)).required(),
});

export const updateVehicleSchema = Joi.object({
  plate_number: Joi.string().optional(),
  brand: Joi.string().optional(),
  vehicle_model: Joi.string().optional(),
  vehicle_type: Joi.string().valid(...Object.values(VehicleType)).optional(),
});