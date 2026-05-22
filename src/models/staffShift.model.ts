import mongoose, { Document, Schema } from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';

// ERD: StaffShift { staff_id PK,FK → Staff,
//                   shift_id PK,FK → Shift,
//                   manager_id FK → Manager }
// Composite PK (staff_id + shift_id) modelled as a unique compound index.

export interface IStaffShift extends Document {
  staff_id: mongoose.Types.ObjectId;
  shift_id: mongoose.Types.ObjectId;
  manager_id?: mongoose.Types.ObjectId;
  created_at: Date;
  updated_at: Date;
}

const staffShiftSchema = new Schema<IStaffShift>(
  {
    staff_id:   { type: Schema.Types.ObjectId, ref: 'Staff',   required: true },
    shift_id:   { type: Schema.Types.ObjectId, ref: 'Shift',   required: true },
    manager_id: { type: Schema.Types.ObjectId, ref: 'Manager', default: null },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } },
);

// Enforce composite PK uniqueness
staffShiftSchema.index({ staff_id: 1, shift_id: 1 }, { unique: true });

staffShiftSchema.plugin(mongoosePaginate);

export const StaffShift = mongoose.model<IStaffShift>('StaffShift', staffShiftSchema);
