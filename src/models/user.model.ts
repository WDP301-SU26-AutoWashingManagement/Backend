import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';
import mongoosePaginate from 'mongoose-paginate-v2';
import { UserRole } from '@common/types';

// ERD: User { user_id PK, email unique, phone unique, password,
//             full_name, avatar_url, is_active,
//             is_email_verified, is_phone_verified,
//             last_login_at, timestamps }

export interface IUser extends Document {
  email: string;
  phone?: string;
  password: string;
  role: UserRole;
  full_name: string;
  avatar_url?: string;
  is_active: boolean;
  is_email_verified: boolean;
  is_phone_verified: boolean;
  last_login_at?: Date;
  created_at: Date;
  updated_at: Date;
  comparePassword(candidate: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>(
  {
    email:             { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone:             { type: String, unique: true, sparse: true, trim: true },
    password:          { type: String, required: true, select: false },
    role:              { type: String, enum: Object.values(UserRole), default: UserRole.CUSTOMER },
    full_name:         { type: String, required: true, trim: true },
    avatar_url:        { type: String, default: null },
    is_active:         { type: Boolean, default: true },
    is_email_verified: { type: Boolean, default: false },
    is_phone_verified: { type: Boolean, default: false },
    last_login_at:     { type: Date, default: null },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } },
);

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = function (candidate: string): Promise<boolean> {
  return bcrypt.compare(candidate, this.password);
};

userSchema.plugin(mongoosePaginate);

export const User = mongoose.model<IUser>('User', userSchema);
