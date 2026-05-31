import Joi from 'joi';

export const createVehicleClassSchema = Joi.object({
    class_name: Joi.string()
        .trim()
        .min(2)
        .max(100)
        .required(),

    description: Joi.string()
        .trim()
        .max(500)
        .optional()
        .allow(null, ''),
});

export const updateVehicleClassSchema = Joi.object({
    class_name: Joi.string()
        .trim()
        .min(2)
        .max(100)
        .optional(),

    description: Joi.string()
        .trim()
        .max(500)
        .optional()
        .allow(null, ''),
});

export const getVehicleClassListSchema = Joi.object({
    page: Joi.number()
        .integer()
        .min(1)
        .optional(),

    limit: Joi.number()
        .integer()
        .min(1)
        .max(100)
        .optional(),

    search: Joi.string()
        .trim()
        .optional(),
});