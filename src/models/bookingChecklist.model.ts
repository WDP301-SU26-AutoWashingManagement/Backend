import mongoose, { Document, Schema, Types } from 'mongoose';
import { applyPlugins } from './global/model.plugin';

// ─── Sub-document interface ──────────────────────────────────────────────────

export interface IChecklistItem {
  label   : string;
  checked : boolean;
}

// ─── Main document interface ─────────────────────────────────────────────────

export interface IBookingChecklist extends Document {
  appointment_id      : Types.ObjectId;
  checklist_items     : IChecklistItem[];
  note                : string | null;
  images              : string[];
  customer_signature  : string | null;
}

// ─── Schema ──────────────────────────────────────────────────────────────────

const checklistItemSchema = new Schema<IChecklistItem>(
  {
    label  : { type: String, required: true, trim: true },
    checked: { type: Boolean, default: false },
  },
  { _id: false },
);

const bookingChecklistSchema = new Schema<IBookingChecklist>(
  {
    appointment_id: {
      type    : Schema.Types.ObjectId,
      ref     : 'Appointment',
      required: true,
      unique  : true,   // 1 Appointment → 1 BookingChecklist
    },

    checklist_items: {
      type   : [checklistItemSchema],
      default: [],
    },

    note: {
      type   : String,
      default: null,
      trim   : true,
    },

    images: {
      type   : [String],
      default: [],
    },

    customer_signature: {
      type   : String,
      default: null,
    },
  },
  { timestamps: true },
);

bookingChecklistSchema.plugin(applyPlugins);

bookingChecklistSchema.index({ appointment_id: 1 });

export const BookingChecklist = mongoose.model<IBookingChecklist>(
  'BookingChecklist',
  bookingChecklistSchema,
);
