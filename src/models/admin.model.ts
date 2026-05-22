import mongoose, { Document, Schema } from 'mongoose';

// ERD: Admin { admin_id PK, user_id FK → User }
// Auth/profile fields (email, password, full_name, …) live on User.

export interface IAdmin extends Document {
  user_id: mongoose.Types.ObjectId;
}

const adminSchema = new Schema<IAdmin>(
  {
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  }
);

export const Admin = mongoose.model<IAdmin>('Admin', adminSchema);
