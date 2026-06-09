import Joi from 'joi';

export const createCustomerSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Email must be a valid email address',
    'any.required': 'Email is required',
  }),
  phone: Joi.string().optional().allow(''),
  password: Joi.string().min(6).optional().messages({
    'string.min': 'Password must be at least 6 characters',
  }),
  full_name: Joi.string().required().messages({
    'any.required': 'Full name is required',
  }),
  avatar_url: Joi.string().optional().allow(''),
  tier_id: Joi.string().optional(),
  membership_points: Joi.number().min(0).optional(),
  reward_points: Joi.number().min(0).optional(),
  referral_code: Joi.string().optional().allow(''),
});

export const updateCustomerSchema = Joi.object({
  email: Joi.string().email().optional(),
  phone: Joi.string().optional().allow(''),
  password: Joi.string().min(6).optional(),
  full_name: Joi.string().optional(),
  avatar_url: Joi.string().optional().allow(''),
  tier_id: Joi.string().optional(),
  membership_points: Joi.number().min(0).optional(),
  reward_points: Joi.number().min(0).optional(),
  referral_code: Joi.string().optional().allow(''),
  is_active: Joi.boolean().optional(),
});

export const getCustomerListSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).default(10),
  search: Joi.string().optional().allow(''),
  tier_id: Joi.string().optional(),
  is_active: Joi.boolean().optional(),
});

