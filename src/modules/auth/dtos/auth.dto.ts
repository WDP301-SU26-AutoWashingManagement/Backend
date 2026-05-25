import { UserRole } from '@common/types';
import Joi from 'joi';

export const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  full_name: Joi.string().required(),
  phone: Joi.string().optional(),
  role: Joi.string().valid(...Object.values(UserRole)).default('customer')
});

export const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
  type: Joi.string().valid(...Object.values(UserRole)).default('customer')
});

export const googleLoginSchema = Joi.object({
  idToken: Joi.string().required(),
});