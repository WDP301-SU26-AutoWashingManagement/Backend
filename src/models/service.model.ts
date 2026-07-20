import mongoose, { Document, Schema, Types } from "mongoose";
import { applyPlugins } from "./global/model.plugin";
import { generateCode } from "./counter.model";

export interface IService extends Document {
    service_group_id: Types.ObjectId;
    service_name: string;
    service_code: string;
    description: string;
    service_price: number;
    duration_minutes: number;
    is_active: boolean;
    is_automated: boolean;
    /** Vector embedding của (service_name + description), dùng cho RAG retrieval. */
    embedding?: number[];
}

const serviceSchema = new Schema<IService>(
    {
        service_group_id: {
            type: Schema.Types.ObjectId,
            ref: "ServiceGroup",
            required: true,
        },

        service_name: {
            type: String,
            required: true,
        },

        service_code: {
            type: String,
            required: true,
            unique: true,
        },

        description: {
            type: String,
            required: true,
        },

        service_price: {
            type: Number,
            required: true,
            min: 0,
        },

        duration_minutes: {
            type: Number,
            required: true,
            default: 60
        },

        is_active: {
            type: Boolean,
            required: true,
            default: true
        },

        is_automated: {
            type: Boolean,
            required: true,
            default: false
        },

        embedding: {
            type: [Number],
            default: [],
            select: false,
        },
    },
    {
        timestamps: true,
    }
);

serviceSchema.plugin(applyPlugins);

serviceSchema.index({ service_group_id: 1 });

serviceSchema.pre("validate", async function (next) {
    if (!this.isNew) return next();

    this.service_code = await generateCode("service_code", "SERV", 8);

    next();
});

export const Service = mongoose.model<IService>("Service", serviceSchema);