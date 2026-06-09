import Joi from 'joi';
import { RequestStatus } from '../../../common/types/enum';

export const createStaffAbsentRequestSchema = Joi.object({
    from_date: Joi.date()
        .required()
        .messages({
            'any.required': 'Ngày bắt đầu là bắt buộc',
            'date.base': 'Ngày bắt đầu không hợp lệ',
        }),

    to_date: Joi.date()
        .min(Joi.ref('from_date'))
        .required()
        .messages({
            'any.required': 'Ngày kết thúc là bắt buộc',
            'date.base': 'Ngày kết thúc không hợp lệ',
            'date.min': 'Ngày kết thúc phải lớn hơn hoặc bằng ngày bắt đầu',
        }),

    reason: Joi.string()
        .trim()
        .min(1)
        .max(500)
        .required()
        .messages({
            'any.required': 'Lý do nghỉ là bắt buộc',
            'string.empty': 'Lý do nghỉ không được để trống',
            'string.max': 'Lý do nghỉ tối đa 500 ký tự',
        }),
});

export const reviewStaffAbsentRequestSchema = Joi.object({
    status: Joi.string()
        .valid(
            RequestStatus.APPROVED,
            RequestStatus.REJECTED
        )
        .required()
        .messages({
            'any.required': 'Trạng thái là bắt buộc',
            'any.only': 'Trạng thái không hợp lệ',
        }),

    note: Joi.string()
        .trim()
        .allow('')
        .max(500)
        .optional()
        .messages({
            'string.max': 'Ghi chú tối đa 500 ký tự',
        }),
});

export const requestIdParamSchema = Joi.object({
    requestId: Joi.string()
        .hex()
        .length(24)
        .required()
        .messages({
            'string.hex': 'Request ID không hợp lệ',
            'string.length': 'Request ID không hợp lệ',
        }),
});

export const getStaffOffSchema = Joi.object({
    from_date: Joi.date(),

    to_date: Joi.date().min(Joi.ref('from_date')),
}).and('from_date', 'to_date');