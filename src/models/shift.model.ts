import mongoose, { Document, Schema } from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';

// ERD: Shift { shift_id PK, shift_date, shift_slot enum,
//              shift_status, method_applied JSON { name, api, details },
//              timestamps }

export interface IMethodApplied {
  name: string;
  api?: string;
  details?: Record<string, unknown>;
}

export interface IShift extends Document {
  shift_date: Date;
  shift_slot: 'morning' | 'afternoon' | 'evening';
  shift_status: 'open' | 'full' | 'cancelled';
  method_applied: IMethodApplied;
  created_at: Date;
  updated_at: Date;
}

const shiftSchema = new Schema<IShift>(
  {
    shift_date:   { type: Date,   required: true },
    shift_slot:   { type: String, enum: ['morning', 'afternoon', 'evening'], required: true },
    shift_status: { type: String, enum: ['open', 'full', 'cancelled'], default: 'open' },
    method_applied: {
      name:    { type: String, required: true },
      api:     { type: String, default: null },
      details: { type: Schema.Types.Mixed, default: {} },
    },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } },
);

shiftSchema.index({ shift_date: 1, shift_slot: 1 });

shiftSchema.plugin(mongoosePaginate);

export const Shift = mongoose.model<IShift>('Shift', shiftSchema);
