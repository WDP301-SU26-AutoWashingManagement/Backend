import mongoose, { Document, Schema } from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';

export interface IPromotion extends Document {
  created_by: mongoose.Types.ObjectId;
  generated_post_id?: mongoose.Types.ObjectId;
  promotion_code: string;
  promotion_objects: Record<string, unknown>;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  bonus_reward_point: number;
  auto_post: boolean;
  start_at: Date;
  end_at: Date;
  is_active: boolean;
  usage_limit?: number;
  used_count: number;
  created_at: Date;
  isValid(): boolean;
}

const promotionSchema = new Schema<IPromotion>(
  {
    created_by:         { type: Schema.Types.ObjectId, ref: 'Admin', required: true },
    generated_post_id:  { type: Schema.Types.ObjectId, ref: 'Post', default: null },
    promotion_code:     { type: String, required: true, unique: true, uppercase: true, trim: true },
    promotion_objects:  { type: Schema.Types.Mixed, default: {} },
    discount_type:      { type: String, enum: ['percentage', 'fixed'], required: true },
    discount_value:     { type: Number, required: true, min: 0 },
    bonus_reward_point: { type: Number, default: 0 },
    auto_post:          { type: Boolean, default: false },
    start_at:           { type: Date, required: true },
    end_at:             { type: Date, required: true },
    is_active:          { type: Boolean, default: true },
    usage_limit:        { type: Number, default: null },
    used_count:         { type: Number, default: 0 },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } },
);

promotionSchema.index({ is_active: 1, start_at: 1, end_at: 1 });

promotionSchema.methods.isValid = function (): boolean {
  const now = new Date();
  return this.is_active && now >= this.start_at && now <= this.end_at &&
    (this.usage_limit == null || this.used_count < this.usage_limit);
};

promotionSchema.plugin(mongoosePaginate);

export const Promotion = mongoose.model<IPromotion>('Promotion', promotionSchema);