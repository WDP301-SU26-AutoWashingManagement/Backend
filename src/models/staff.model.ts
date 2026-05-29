import { StaffRole } from "../common/types/enum";
import mongoose, { Document, Schema, Types } from "mongoose";
import { applyPlugins } from "./global/model.plugin";

export interface IStaff extends Document{
  user_id: Types.ObjectId;
  branch_id: Types.ObjectId | null;

  staff_type: StaffRole;

  hire_date: Date;
  hour_per_week: number;           // chỗ này có thể điều chỉnh cho từng loại Staff
  salary_coefficient: number;

}

const staffSchema = new Schema<IStaff>(
    {
        user_id: { 
            type: Schema.Types.ObjectId, required: true, ref: "User" 
        },

        branch_id: {
            type: Schema.Types.ObjectId,
            default: null,
            ref: "Branch",
        },

        staff_type: {
            type: String,
            enum: Object.values(StaffRole),
            required: true,
        },

        hire_date: { 
            type: Date, 
            required: true,
            default: 40 
        },

        hour_per_week: {
            type: Number,
            required: true,
            min: 0,
            default: 10
        },

        salary_coefficient: {
            type: Number,
            required: true,
            min: 0,
            default: 1,
        },
    }
);

staffSchema.plugin(applyPlugins);

export const Staff = mongoose.model<IStaff>('Staff', staffSchema);