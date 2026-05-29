import mongoose, { Document, Schema, Types } from "mongoose";
import { generateCode } from "./counter.model";
import { generateReferralCode } from "./global/model.generate";
import { applyPlugins } from "./global/model.plugin";

export interface ICustomer extends Document {
    user_id: Types.ObjectId;
    tier_id: Types.ObjectId;

    customer_code: string;
    referral_code: string;

    membership_points: number;
    reward_points: number;
}

const customerSchema = new Schema<ICustomer>(
    {
        user_id: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
            unique: true,
        },

        tier_id: {
            type: Schema.Types.ObjectId,
            ref: "TierConfig",
            required: true,
        },

        customer_code: {
            type: String,
            unique: true,
        },

        referral_code: {
            type: String,
            unique: true,
        },

        membership_points: {
            type: Number,
            default: 0,
        },

        reward_points: {
            type: Number,
            default: 0,
        },
    },
    {
        timestamps: false,
    }
);

customerSchema.plugin(applyPlugins);

customerSchema.pre("save", async function (next) {
    if (!this.isNew) return next();

    this.customer_code = await generateCode("customer_code", "CUS", 6);
    // this.referral_code = generateReferralCode();
    // không generate referal code ở đây
    next();
});

export const Customer = mongoose.model<ICustomer>("Customer", customerSchema);