import mongoose, { Document, Schema } from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';

// ERD: Promotion { promotion_id PK, admin_id FK → Admin,
//                  promotion_code, promotion_objects JSON { tiers, vehicle_types, services },
//                  discount_type, discount_value, bonus_reward_point,
//                  auto_post, start_at, end_at, is_active, timestamps }

export interface IPromotionObjects {
  tiers?: string[];
  vehicle_types?: string[];
  services?: string[];
}

export interface IPromotion extends Document {
  admin_id: mongoose.Types.ObjectId;
  promotion_code: string;
  promotion_objects: IPromotionObjects;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  bonus_reward_point: number;
  auto_notification: boolean;
  start_at: Date;
  end_at: Date;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
  isValid(): boolean;
}

const promotionSchema = new Schema<IPromotion>(
  {
    admin_id:           { type: Schema.Types.ObjectId, ref: 'Admin', required: true },
    promotion_code:     { type: String, required: true, unique: true, uppercase: true, trim: true },
    promotion_objects:  { type: Schema.Types.Mixed, default: {} },
    discount_type:      { type: String, enum: ['percentage', 'fixed'], required: true },
    discount_value:     { type: Number, required: true, min: 0 },
    bonus_reward_point: { type: Number, default: 0, min: 0 },
    auto_notification:  { type: Boolean, default: false },
    start_at:           { type: Date, required: true },
    end_at:             { type: Date, required: true },
    is_active:          { type: Boolean, default: true },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } },
);

promotionSchema.index({ promotion_code: 1 });
promotionSchema.index({ is_active: 1, start_at: 1, end_at: 1 });

promotionSchema.methods.isValid = function (): boolean {
  const now = new Date();
  return this.is_active && now >= this.start_at && now <= this.end_at;
};

promotionSchema.plugin(mongoosePaginate);

export const Promotion = mongoose.model<IPromotion>('Promotion', promotionSchema);
