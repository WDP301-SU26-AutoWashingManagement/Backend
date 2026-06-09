import mongoose, { Schema, Document, Types } from "mongoose";
import { applyPlugins } from "./global/model.plugin";
import { TierClass } from "@common/types/enum";

export interface ITierConfig extends Document {
  admin_id: Types.ObjectId;
  tier_name: TierClass;
  min_membership_points: number;
  max_membership_points: number;
  booking_window_days: number;
  discount_percentage: number;
  free_features?: Types.ObjectId[];
}

const tierConfigSchema = new Schema<ITierConfig>(
    {
        admin_id: {
            type: Schema.Types.ObjectId,
            ref: "Admin",
            required: true,
        },

        tier_name: {
            type: String,
            enum: Object.values(TierClass),
            required: true,
            trim: true,
        },

        min_membership_points: {
            type: Number,
            required: true,
        },

        max_membership_points: {
            type: Number,
            required: true,
        },

        booking_window_days: {
            type: Number,
            required: true,
        },

        discount_percentage: {
            type: Number,
            required: true,
        },

        free_features: [
            {
                type: Schema.Types.ObjectId,
                ref: "Service",
            },
        ],
    },
    {
        timestamps: true,
    }
);

tierConfigSchema.plugin(applyPlugins);

export const TierConfig =  mongoose.model<ITierConfig>("TierConfig", tierConfigSchema);