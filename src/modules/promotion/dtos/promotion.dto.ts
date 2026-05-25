// promotion.schemas.ts

import Joi from 'joi';

const DISCOUNT_TYPES = ['percentage', 'fixed'] as const;

// ─────────────────────────────────────────────
// PromotionService.createPromotion()
// ─────────────────────────────────────────────
export const createPromotionSchema = Joi.object({
    promotion_code:    Joi.string().min(3).max(50).required(),
    promotion_objects: Joi.object().optional(),
    discount_type:     Joi.string().valid(...DISCOUNT_TYPES).required(),
    discount_value:    Joi.number().min(0).required(),
    auto_post:         Joi.boolean().optional(),
    start_at:          Joi.string().isoDate().required(),
    end_at:            Joi.string().isoDate().required(),
    is_active:         Joi.boolean().optional(),
    usage_limit:       Joi.number().integer().min(1).allow(null).optional(),
});

// ─────────────────────────────────────────────
// PromotionService.updatePromotion()
// ─────────────────────────────────────────────
export const updatePromotionSchema = Joi.object({
    promotion_objects: Joi.object().optional(),
    discount_type:     Joi.string().valid(...DISCOUNT_TYPES).optional(),
    discount_value:    Joi.number().min(0).optional(),
    auto_post:         Joi.boolean().optional(),
    start_at:          Joi.string().isoDate().optional(),
    end_at:            Joi.string().isoDate().optional(),
    is_active:         Joi.boolean().optional(),
    usage_limit:       Joi.number().integer().min(1).allow(null).optional(),
});

// ─────────────────────────────────────────────
// PromotionService.toggleActive()
// ─────────────────────────────────────────────
export const toggleActiveSchema = Joi.object({
    is_active: Joi.boolean().required(),
});

// ─────────────────────────────────────────────
// PromotionService.getPromotionList()
// ─────────────────────────────────────────────
export const getPromotionListSchema = Joi.object({
    page:          Joi.number().integer().min(1).default(1),
    limit:         Joi.number().integer().min(1).max(100).default(10),
    is_active:     Joi.boolean().optional(),
    discount_type: Joi.string().valid(...DISCOUNT_TYPES).optional(),
    search:        Joi.string().optional(),
    start_from:    Joi.string().isoDate().optional(),
    start_to:      Joi.string().isoDate().optional(),
    end_from:      Joi.string().isoDate().optional(),
    end_to:        Joi.string().isoDate().optional(),
});