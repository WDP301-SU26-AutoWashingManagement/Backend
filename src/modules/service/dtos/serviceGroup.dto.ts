import Joi from 'joi';

export const createServiceGroupSchema = Joi.object({
    group_name:       Joi.string().min(2).max(100).trim().required(),
    description:      Joi.string().max(500).trim().optional().allow(''),
    is_active:        Joi.boolean().optional(),
});

export const updateServiceGroupSchema = Joi.object({
    group_name:     Joi.string().min(2).max(100).trim().optional(),
    description:      Joi.string().max(500).trim().optional().allow(''),
    is_active:        Joi.boolean().optional(),
});

export const toggleActiveSchema = Joi.object({
    is_active: Joi.boolean().required(),
});

export const getServiceGroupListSchema = Joi.object({
    page:      Joi.number().integer().min(1).default(1),
    limit:     Joi.number().integer().min(1).max(100).default(10),
    is_active: Joi.boolean().optional(),
    search:    Joi.string().trim().optional(),
});