import mongoose, { Document, Schema } from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';

export interface ITierConfig extends Document {
  tier_name: string;
  min_membership_points: number;
  earn_membership_rate: number;
  earn_reward_rate: number;
  booking_window_days: number;
  discount_percentage: number;
  perks_feature: Record<string, unknown>;
  updated_by: mongoose.Types.ObjectId;
  updated_at: Date;
}

const tierSchema = new Schema<ITierConfig>({
  tier_name:             { type: String, required: true, unique: true },
  min_membership_points: { type: Number, required: true, default: 0 },
  earn_membership_rate:  { type: Number, required: true, default: 1 },
  earn_reward_rate:      { type: Number, required: true, default: 1 },
  booking_window_days:   { type: Number, required: true, default: 7 },
  discount_percentage:   { type: Number, required: true, default: 0, min: 0, max: 100 },
  perks_feature:         { type: Schema.Types.Mixed, default: {} },
  updated_by:            { type: Schema.Types.ObjectId, ref: 'Admin', required: true },
  updated_at:            { type: Date, default: Date.now },
});

tierSchema.pre('save', function (next) { this.updated_at = new Date(); next(); });
export const TierConfig = mongoose.model<ITierConfig>('TierConfig', tierSchema);