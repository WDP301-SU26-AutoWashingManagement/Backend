import Joi from 'joi'
import { IAdminUpdate } from "../interfaces/admin.interface";
 
export const updateAdminSchema = Joi.object<IAdminUpdate>({
    user_id: Joi.string().hex().length(24).optional(),
    branch_id: Joi.string().hex().length(24).optional().allow(null, ""),
    is_active: Joi.boolean().optional(),
});