import Joi from 'joi';

export const forgotPasswordSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Email không hợp lệ',
    'any.required': 'Email là bắt buộc',
  }),
});

export const verifyOtpSchema = Joi.object({
  email: Joi.string().email().required(),
  otp:   Joi.string().length(6).required().messages({
    'string.length': 'OTP phải có đúng 6 ký tự',
    'any.required':  'OTP là bắt buộc',
  }),
});

export const resetPasswordSchema = Joi.object({
  email:        Joi.string().email().required(),
  otp:          Joi.string().length(6).required(),
  new_password: Joi.string().min(6).required().messages({
    'string.min': 'Mật khẩu mới tối thiểu 6 ký tự',
  }),
});

export const changePasswordSchema = Joi.object({
  current_password: Joi.string().required().messages({
    'any.required': 'Mật khẩu hiện tại là bắt buộc',
  }),
  new_password: Joi.string().min(6).required().messages({
    'string.min': 'Mật khẩu mới tối thiểu 6 ký tự',
  }),
  confirm_password: Joi.string()
    .valid(Joi.ref('new_password'))
    .required()
    .messages({
      'any.only': 'Xác nhận mật khẩu không khớp',
    }),
});
