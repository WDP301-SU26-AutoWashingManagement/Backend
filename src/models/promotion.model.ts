import mongoose, { Document, Schema, Types } from "mongoose";
import { applyPlugins } from "./global/model.plugin";

export enum EPromotionType {
    DISCOUNT = 'discount',
    BONUS_SERVICE = 'bonus_service'
}

export interface IPromotion extends Document {
    //Who created
    boss_id: Types.ObjectId;
    //Name of promotion
    promotion_name: string;
    //Description of promotion
    description: string;
    //Code of promotion
    code: string;
    //Type of promotion: Bonus service or discount
    type: EPromotionType;
    //Services ID of promotion (only for bonus service type)
    service_ids: Types.ObjectId[];
    //Discount percentage of promotion (only for discount type)
    discount_percentage: number;
    //Max discount amount for an order (only for discount type)
    discount_amount: number;
    //Minimum order amount for using promotion
    min_order_amount: number;
    //Start date of promotion
    start_date: Date;
    //End date of promotion
    end_date: Date;
    //Is promotion active
    is_active: boolean;
}

const promotionSchema = new Schema<IPromotion>(
    {
        boss_id: {
            type: Schema.Types.ObjectId,
            ref: "Boss",
            required: true,
        },

        promotion_name: {
            type: String,
            required: true,
        },

        description: {
            type: String,
            required: true,
        },

        code: {
            type: String,
            required: true,
        },

        type: {
            type: String,
            required: true,
        },

        service_ids: {
            type: [Schema.Types.ObjectId],
            ref: "Service",
            default: [],
        },  

        discount_percentage: {
            type: Number,
            required: false,
        },

        discount_amount: {
            type: Number,
            required: false,
        },

        min_order_amount: {
            type: Number,
            required: true,
        },

        start_date: {
            type: Date,
            required: true,
        },

        end_date: {
            type: Date,
            required: true,
        },

        is_active: {
            type: Boolean,
            required: true,
        },
    },
    {
        timestamps: true,
    }
)   

promotionSchema.plugin(applyPlugins)

export const Promotion = mongoose.model<IPromotion>("Promotion", promotionSchema);