import Joi from "joi";

export const washManualSchema = Joi.object({
    plate: Joi.string().required().messages({
        'any.required': 'Biển số xe là bắt buộc',
    }),
})