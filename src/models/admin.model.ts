import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IAdmin extends Document {
  email: string;
  password: string;
  full_name: string;
  avatar_url?: string;
  is_active: boolean;
  last_login_at: Date;
  created_at: Date;
  updated_at: Date;
  comparePassword(candidate: string): Promise<boolean>;
}

const schema = new Schema<IAdmin>(
  {
    email:                 { type: String, required: true, unique: true, lowercase: true, trim: true },
    password:              { type: String, required: true, select: false },
    full_name:             { type: String, required: true, trim: true },
    avatar_url:            { type: String, default: null },
    is_active:             { type: Boolean, default: true },
    last_login_at:         { type: Date, default: null },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } },
);

schema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

schema.methods.comparePassword = function (c: string) { return bcrypt.compare(c, this.password); };

export default mongoose.model<IAdmin>('Admin', schema);