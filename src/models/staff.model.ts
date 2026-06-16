import { StaffRole } from "../common/types/enum";
import mongoose, { Document, Schema, Types } from "mongoose";
import { applyPlugins } from "./global/model.plugin";
import { generateCode } from "./counter.model";

export interface IStaff extends Document{
    user_id: Types.ObjectId;
    branch_id: Types.ObjectId | null;
    staff_code: string;
    staff_type: StaffRole;

    hire_date: Date;
    hour_per_week: number;           // chỗ này có thể điều chỉnh cho từng loại Staff
    salary_coefficient: number;
    annual_leave_days: number;      // Tổng số ngày phép được cấp mỗi năm
    used_leave_days: number;        // Đã sử dụng
    
}

const staffSchema = new Schema<IStaff>(
    {
        user_id: { 
            type: Schema.Types.ObjectId, 
            required: true, 
            ref: "User" 
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

        staff_code: {
            type: String,
            unique: true,
        },

        hire_date: { 
            type: Date, 
            required: true,
            default: Date.now 
        },

        hour_per_week: {
            type: Number,
            required: true,
            min: 0,
            default: 40
        },

        salary_coefficient: {
            type: Number,
            required: true,
            min: 0,
            default: 1,
        },

        annual_leave_days: {
            type: Number,
            required: true,
            min: 0,
            default: 12,
        },

        used_leave_days: {
            type: Number,
            required: true,
            min: 0,
            default: 0,
        },

    }
);

staffSchema.plugin(applyPlugins);

staffSchema.pre("save", async function (next) {
    if (!this.isNew) return next();

    this.staff_code = await generateCode("staff_code", "STAFF", 8);

    next();
});
export const Staff = mongoose.model<IStaff>('Staff', staffSchema);