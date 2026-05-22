import mongoose, { Document, Schema } from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';

// ERD: Manager { manager_id PK, user_id FK → User, salary_coefficient }

export interface IManager extends Document {
  user_id: mongoose.Types.ObjectId;
  salary_coefficient: number;
}

const managerSchema = new Schema<IManager>(
  {
    user_id:            { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    salary_coefficient: { type: Number, required: true, default: 1.0, min: 0 },
  }
);

managerSchema.plugin(mongoosePaginate);

export const Manager = mongoose.model<IManager>('Manager', managerSchema);
