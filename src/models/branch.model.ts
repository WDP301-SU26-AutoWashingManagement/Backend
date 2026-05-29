import mongoose, { Schema, Document, Types } from "mongoose";
import { applyPlugins } from "./global/model.plugin";

export interface IBranch extends Document {
    manager_id?: Types.ObjectId;                        // manager_id này là staff_id mà có StaffRole là Manager
    web_url?: string;
    branch_phone?: string;
    branch_address?: {
        street: string;
        ward: string;
        district: string;
        city: string;
    };
    geo?: {
        longitude: number;
        latitude: number;
    };
    operating_time: {
        default_open: string;
        default_close: string;
        weekend_open?: string;
        weekend_close?: string;
    };
    is_holiday_off: boolean;
    bay_counts: number;               // Dựa vào biến này để xếp lịch số xe mỗi lần tại 1 branch
    is_active: boolean;
}

const branchSchema = new Schema<IBranch>(
    {
        manager_id: {
            type: Schema.Types.ObjectId,
            ref: "Staff",
            default: null,
        },
        web_url: {
            type: String,
            trim: true
        },
        branch_phone: {
            type: String,
            trim: true
        },
        branch_address: {
            street: String,
            ward: String,
            district: String,
            city: String,
        },

        geo: {
            longitude: Number,
            latitude: Number,
        },

        operating_time: {
            default_open: String,
            default_close: String,
            weekend_open: String,
            weekend_close: String,
        },

        is_holiday_off: {
            type: Boolean,
            default: false,
        },

        bay_counts: {
            type: Number,
            required: true,
        },

        is_active: {
            type: Boolean,
            default: true,
        },
    },
    {
        timestamps: true,
    }
);

branchSchema.plugin(applyPlugins);

export const Branch =  mongoose.model<IBranch>("Branch", branchSchema);