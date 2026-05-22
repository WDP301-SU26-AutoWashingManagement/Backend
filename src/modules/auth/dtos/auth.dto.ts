import Joi from 'joi';

export const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
  type: Joi.string().valid('customer', 'admin').default('customer')
});

export const googleLoginSchema = Joi.object({
  idToken: Joi.string().required(),
});