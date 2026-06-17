import Joi from 'joi'

export const addStaffToScheduleSchema = Joi.object({
  staff_id: Joi.string().trim().required(),
});

export const switchStaffSchema = Joi.object({
  body: Joi.object({
    schedule_id_1: Joi.string().trim().required(),
    staff_id_1: Joi.string().trim().required(),
    schedule_id_2: Joi.string().trim().required(),
    staff_id_2: Joi.string().trim().required(),
  }).required(),
});