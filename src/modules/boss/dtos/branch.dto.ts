import Joi from "joi";
import { IBranchRequest } from "../interfaces/branch.interface";

const branchSchemaValidation = Joi.object<IBranchRequest>({
    web_url: Joi.string().trim().uri().optional(),

    branch_phone: Joi.string().trim().optional(),

    branch_address: Joi.object({
        street: Joi.string().trim().required(),
        ward: Joi.string().trim().required(),
        district: Joi.string().trim().required(),
        city: Joi.string().trim().required(),
    }).optional(),

    geo: Joi.object({
        longitude: Joi.number().min(-180).max(180).required(),
        latitude: Joi.number().min(-90).max(90).required(),
    }).optional(),

    operating_time: Joi.object({
        default_open: Joi.string().trim().required(),
        default_close: Joi.string().trim().required(),
        weekend_open: Joi.string().trim().optional(),
        weekend_close: Joi.string().trim().optional(),
    }).required(),

    is_holiday_off: Joi.boolean().default(false),

    bay_counts: Joi.number()
        .integer()
        .min(1)
        .required(),

    is_active: Joi.boolean().default(true),
});

export const createBranchSchema = branchSchemaValidation;

export const updateBranchSchema = branchSchemaValidation.fork(
    ["operating_time", "bay_counts"],
    (schema) => schema.optional()
);