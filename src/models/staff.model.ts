import mongoose, { Document, Schema } from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';

// ERD: Staff { staff_id PK, user_id FK → User,
//              shift_per_week, salary_coefficient }

export interface IStaff extends Document {
  user_id: mongoose.Types.ObjectId;
  shift_per_week: number;
  salary_coefficient: number;
}

const staffSchema = new Schema<IStaff>(
  {
    user_id:            { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    shift_per_week:     { type: Number, required: true, default: 5, min: 0 },
    salary_coefficient: { type: Number, required: true, default: 1.0, min: 0 },
  }
);

staffSchema.plugin(mongoosePaginate);

export const Staff = mongoose.model<IStaff>('Staff', staffSchema);
