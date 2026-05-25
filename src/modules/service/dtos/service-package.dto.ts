import Joi from 'joi';

// ─────────────────────────────────────────────
// Joi Schemas — dùng trong validate() middleware
// ─────────────────────────────────────────────

export const createServicePackageSchema = Joi.object({
    service_name:     Joi.string().min(2).max(100).trim().required(),
    description:      Joi.string().max(500).trim().optional().allow(''),
    service_price:    Joi.number().min(0).required(),
    duration_minutes: Joi.number().integer().min(1).required(),
    is_active:        Joi.boolean().optional(),
});

export const updateServicePackageSchema = Joi.object({
    service_name:     Joi.string().min(2).max(100).trim().optional(),
    description:      Joi.string().max(500).trim().optional().allow(''),
    service_price:    Joi.number().min(0).optional(),
    duration_minutes: Joi.number().integer().min(1).optional(),
    is_active:        Joi.boolean().optional(),
});

export const toggleActiveSchema = Joi.object({
    is_active: Joi.boolean().required(),
});

export const getServicePackageListSchema = Joi.object({
    page:      Joi.number().integer().min(1).default(1),
    limit:     Joi.number().integer().min(1).max(100).default(10),
    is_active: Joi.boolean().optional(),
    search:    Joi.string().trim().optional(),
});

