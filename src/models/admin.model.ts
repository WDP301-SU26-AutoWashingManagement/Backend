import mongoose, { Schema, Document, Types } from "mongoose";
import { applyPlugins } from "./global/model.plugin";
import { generateCode } from "./counter.model";

export interface IAdmin extends Document {
  user_id: Types.ObjectId;
  branch_id: Types.ObjectId | null;
}

const adminSchema = new Schema<IAdmin>(
    {
        user_id: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
            unique: true, // 1 user chỉ có 1 admin profile
        },
        branch_id: {
            type: Schema.Types.ObjectId,
            ref: "Branch",
            default: null,
        },
    },
);

adminSchema.plugin(applyPlugins);

export const Admin = mongoose.model<IAdmin>("Admin", adminSchema);