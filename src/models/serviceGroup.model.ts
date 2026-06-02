import mongoose, { Document, Schema, Types } from "mongoose";
import { applyPlugins } from "./global/model.plugin";
import { generateCode } from "./counter.model";

export interface IServiceGroup extends Document {
  group_name: string;
  group_code: string;
  description: string;
}

const serviceGroupSchema = new Schema<IServiceGroup>(
    {
        group_name: {
            type: String,
            required: true,
        },

        group_code: {
            type: String,
            required: true,
            unique: true,
        },

        description: {
            type: String,
            required: true,
        },

    },
    {
        timestamps: true,
    }
);

serviceGroupSchema.plugin(applyPlugins);

serviceGroupSchema.pre("save", async function (next) {
    if (!this.isNew) return next();

    this.group_code = await generateCode("group_code", "SERVGR", 8);

    next();
});

export const ServiceGroup = mongoose.model<IServiceGroup>("ServiceGroup", serviceGroupSchema);