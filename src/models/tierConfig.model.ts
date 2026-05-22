import mongoose, { Document, Schema } from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';

// ERD: TierConfig { tier_id PK, admin_id FK → Admin,
//                   tier_name unique, min_membership_points,
//                   booking_window_days, discount_percentage,
//                   perks_note, timestamps }

export interface ITierConfig extends Document {
  admin_id: mongoose.Types.ObjectId;
  tier_name: string;
  min_membership_points: number;
  booking_window_days: number;
  discount_percentage: number;
  perks_note?: string;
  created_at: Date;
  updated_at: Date;
}

const tierConfigSchema = new Schema<ITierConfig>(
  {
    admin_id:              { type: Schema.Types.ObjectId, ref: 'Admin', required: true },
    tier_name:             { type: String, required: true, unique: true, trim: true },
    min_membership_points: { type: Number, required: true, default: 0, min: 0 },
    booking_window_days:   { type: Number, required: true, default: 7, min: 0 },
    discount_percentage:   { type: Number, required: true, default: 0, min: 0, max: 100 },
    perks_note:            { type: String, default: null },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } },
);

tierConfigSchema.plugin(mongoosePaginate);

export const TierConfig = mongoose.model<ITierConfig>('TierConfig', tierConfigSchema);
