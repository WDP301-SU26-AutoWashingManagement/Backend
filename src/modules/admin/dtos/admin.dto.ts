import Joi from 'joi';

export const createAdminSchema = Joi.object({
	email: Joi.string().email().required(),
	password: Joi.string().min(6).required(),
	full_name: Joi.string().required(),
	avatar_url: Joi.string().uri().optional().allow(null, ''),
	is_active: Joi.boolean().optional(),
});

