import mongoose, { Document, Schema } from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';

// ERD: Customer { customer_id PK, user_id FK → User, tier_id FK → TierConfig,
//                 registration_channel, has_online_access,
//                 membership_points, reward_points, refferal_code unique }
// Auth/profile fields (email, password, phone, …) live on User.

export interface ICustomer extends Document {
  user_id: mongoose.Types.ObjectId;
  tier_id?: mongoose.Types.ObjectId;
  registration_channel: 'google' | 'admin';
  has_online_access: boolean;
  membership_points: number;
  reward_points: number;
  referral_code: string;
}

const customerSchema = new Schema<ICustomer>(
  {
    user_id:              { type: Schema.Types.ObjectId, ref: 'User',       required: true, unique: true },
    tier_id:              { type: Schema.Types.ObjectId, ref: 'TierConfig', default: null },
    registration_channel: { type: String, enum: ['google', 'admin'], default: 'google' },
    has_online_access:    { type: Boolean, default: false },
    membership_points:    { type: Number,  default: 0, min: 0 },
    reward_points:        { type: Number,  default: 0, min: 0 },
    referral_code:        { type: String,  unique: true, sparse: true },
  }
);

customerSchema.pre('save', function (next) {
  if (!this.referral_code) {
    this.referral_code = `CUS${Date.now().toString(36).toUpperCase()}`;
  }
  next();
});

customerSchema.plugin(mongoosePaginate);

export const Customer = mongoose.model<ICustomer>('Customer', customerSchema);
