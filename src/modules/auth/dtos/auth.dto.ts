import { UserRole } from '../../../common/types/enum';
import Joi from 'joi';

export const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  full_name: Joi.string().required(),
  phone: Joi.string().optional(),
  role: Joi.string()
    .valid('admin', 'staff')
    .required(),
  branch_id: Joi.string().optional(),
});

export const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

export const googleLoginSchema = Joi.object({
  idToken: Joi.string().required(),
});