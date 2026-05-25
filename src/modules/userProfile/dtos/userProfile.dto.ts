import Joi from 'joi';

const userFields = {
  full_name:  Joi.string().trim().min(2).max(100).optional(),
  phone:      Joi.string().trim().pattern(/^[0-9+]{9,15}$/).optional(),
  avatar_url: Joi.string().uri().optional().allow(null, ''),
};

export const updateProfileCustomerSchema = Joi.object({
  ...userFields,
  has_online_access: Joi.boolean().optional(),
});

export const updateProfileStaffSchema = Joi.object({
  ...userFields,
});

export const updateProfileManagerSchema = Joi.object({
  ...userFields,
});

export const updateProfileAdminSchema = Joi.object({
  ...userFields,
});

export const changePasswordSchema = Joi.object({
  old_password: Joi.string().required().messages({
    'any.required': 'Old password is required',
  }),
  new_password: Joi.string().min(6).required().messages({
    'string.min':   'New password must be at least 6 characters long',
    'any.required': 'New password is required',
  }),
});
