import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';
import mongoosePaginate from 'mongoose-paginate-v2';

export interface ICustomer extends Document {
  tier_id?: mongoose.Types.ObjectId;
  phone?: string;
  identity_number?: string;
  email: string;
  password: string;
  full_name: string;
  avatar_url?: string;
  registration_channel: 'app' | 'google' | 'admin';
  has_online_access: boolean;
  membership_points: number;
  reward_points: number;
  is_active: boolean;
  is_email_verified: boolean;
  is_phone_verified: boolean;
  last_login_at: Date;
  referral_code: string;
  comparePassword(candidate: string): Promise<boolean>;
}

const schema = new Schema<ICustomer>(
  {
    tier_id:                    { type: Schema.Types.ObjectId, ref: 'TierConfig', default: null },
    phone:                      { type: String, unique: true, sparse: true, trim: true },
    identity_number:            { type: String, unique: true, sparse: true, trim: true },
    email:                      { type: String, required: true, unique: true, lowercase: true, trim: true },
    password:                   { type: String, required: true, select: false },
    full_name:                  { type: String, required: true, trim: true },
    avatar_url:                 { type: String, default: null },
    registration_channel:       { type: String, enum: ['app', 'google', 'admin'], default: 'app' },
    has_online_access:          { type: Boolean, default: false },
    membership_points:          { type: Number, default: 0 },
    reward_points:              { type: Number, default: 0 },
    is_active:                  { type: Boolean, default: true },
    is_email_verified:          { type: Boolean, default: false },
    is_phone_verified:          { type: Boolean, default: false },
    last_login_at:              { type: Date, default: null },
    referral_code:              { type: String, unique: true, sparse: true },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } },
);

schema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

schema.pre('save', function (next) {
  if (!this.referral_code) this.referral_code = `CUS${Date.now().toString(36).toUpperCase()}`;
  next();
});

schema.methods.comparePassword = (c: string, hash: string) => bcrypt.compare(c, hash);
schema.plugin(mongoosePaginate);

export default mongoose.model<ICustomer>('Customer', schema);
