import Joi from 'joi';
import { EPromotionType } from '../../../models/promotion.model';

export const createPromotionSchema = Joi.object({
  promotion_name: Joi.string().trim().required(),
  description: Joi.string().trim().required(),
  code: Joi.string().trim().required(),
  type: Joi.string().valid(...Object.values(EPromotionType)).required(),
  
  service_ids: Joi.when('type', {
    is: EPromotionType.BONUS_SERVICE,
    then: Joi.array().items(Joi.string().regex(/^[0-9a-fA-F]{24}$/)).min(1).required(),
    otherwise: Joi.array().max(0).optional().default([])
  }),

  discount_percentage: Joi.when('type', {
    is: EPromotionType.DISCOUNT,
    then: Joi.number().min(0).max(100).required(),
    otherwise: Joi.number().valid(0).optional().default(0)
  }),

  discount_amount: Joi.when('type', {
    is: EPromotionType.DISCOUNT,
    then: Joi.number().min(0).required(),
    otherwise: Joi.number().valid(0).optional().default(0)
  }),

  min_order_amount: Joi.number().min(0).required(),
  start_date: Joi.date().required(),
  end_date: Joi.date().greater(Joi.ref('start_date')).required(),
  is_active: Joi.boolean().required(),
});

export const updatePromotionSchema = Joi.object({
  promotion_name: Joi.string().trim().optional(),
  description: Joi.string().trim().optional(),
  code: Joi.string().trim().optional(),
  type: Joi.string().valid(...Object.values(EPromotionType)).optional(),
  
  service_ids: Joi.when('type', {
    is: EPromotionType.BONUS_SERVICE,
    then: Joi.array().items(Joi.string().regex(/^[0-9a-fA-F]{24}$/)).min(1).required(),
    otherwise: Joi.when('type', {
      is: EPromotionType.DISCOUNT,
      then: Joi.array().max(0).optional(),
      otherwise: Joi.array().items(Joi.string().regex(/^[0-9a-fA-F]{24}$/)).optional()
    })
  }),

  discount_percentage: Joi.when('type', {
    is: EPromotionType.DISCOUNT,
    then: Joi.number().min(0).max(100).optional(),
    otherwise: Joi.when('type', {
      is: EPromotionType.BONUS_SERVICE,
      then: Joi.number().valid(0).optional(),
      otherwise: Joi.number().min(0).max(100).optional()
    })
  }),

  discount_amount: Joi.when('type', {
    is: EPromotionType.DISCOUNT,
    then: Joi.number().min(0).optional(),
    otherwise: Joi.when('type', {
      is: EPromotionType.BONUS_SERVICE,
      then: Joi.number().valid(0).optional(),
      otherwise: Joi.number().min(0).optional()
    })
  }),

  min_order_amount: Joi.number().min(0).optional(),
  start_date: Joi.date().optional(),
  end_date: Joi.date().greater(Joi.ref('start_date')).optional(),
  is_active: Joi.boolean().optional(),
});

export const getDiscountSchema = Joi.object({
  code: Joi.string().trim().required()
});
