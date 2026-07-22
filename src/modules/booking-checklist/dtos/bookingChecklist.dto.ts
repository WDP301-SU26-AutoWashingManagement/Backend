import Joi from 'joi';

const checklistItemSchema = Joi.object({
  label  : Joi.string().trim().required(),
  checked: Joi.boolean().required(),
});

// ─── Create ──────────────────────────────────────────────────────────────────

export const createBookingChecklistDto = Joi.object({
  appointment_id    : Joi.string().hex().length(24).required(),
  checklist_items   : Joi.array().items(checklistItemSchema).default([]),
  note              : Joi.string().trim().allow(null, '').default(null),
  customer_signature: Joi.string().allow(null, '').default(null),
  customer_signature_after: Joi.string().allow(null, '').default(null),
});

// ─── Update ──────────────────────────────────────────────────────────────────

export const updateBookingChecklistDto = Joi.object({
  checklist_items   : Joi.array().items(checklistItemSchema),
  note              : Joi.string().trim().allow(null, ''),
  customer_signature: Joi.string().allow(null, ''),
  customer_signature_after: Joi.string().allow(null, ''),
}).min(1);

export const createBookingReportDto = Joi.object({
  title      : Joi.string().trim().required(),
  fullname   : Joi.string().trim().required(),
  description: Joi.string().trim().allow(null, '').default(null),
  // values are populated from uploaded image files via multipart field "evidence"
  evidence   : Joi.array().items(Joi.string()).default([]),
  phone      : Joi.string().trim().allow(null, '').default(null),
  email      : Joi.string().trim().email({ tlds: { allow: false } }).allow(null, '').default(null),
  isConfirm  : Joi.boolean().default(false),
});
