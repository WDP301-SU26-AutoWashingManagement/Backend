import Joi from 'joi';

export const createServicePackageSchema = Joi.object({
    service_group_id: Joi.string()
        .trim()
        .required(),

    package_name: Joi.string()
        .trim()
        .max(255)
        .required(),

    description: Joi.string()
        .trim()
        .required(),

    package_discount_percentage: Joi.number()
        .min(0)
        .max(100)
        .default(1),
});

export const updateServicePackageSchema = Joi.object({
    service_group_id: Joi.string()
        .trim(),

    package_name: Joi.string()
        .trim()
        .max(255),

    description: Joi.string()
        .trim(),

    package_discount_percentage: Joi.number()
        .min(0)
        .max(100),
}).min(1);

export const toggleActiveSchema = Joi.object({
    is_active: Joi.boolean()
        .required(),
});

export const getServicePackageListSchema = Joi.object({
    page: Joi.number()
        .integer()
        .min(1)
        .default(1),

    limit: Joi.number()
        .integer()
        .min(1)
        .default(10),

    search: Joi.string()
        .trim(),

    is_active: Joi.boolean(),
});