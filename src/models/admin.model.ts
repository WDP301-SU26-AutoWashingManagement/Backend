import mongoose, { Schema, Document, Types } from "mongoose";
import { applyPlugins } from "./global/model.plugin";
import { generateCode } from "./counter.model";

export interface IAdmin extends Document {
  user_id: Types.ObjectId;
  admin_code: string;
}

const adminSchema = new Schema<IAdmin>(
    {
        user_id: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
            unique: true, // 1 user chỉ có 1 admin profile
        },

        admin_code: {
            type: String,
            required: true,
            unique: true,
        },
    },
);

adminSchema.index({ userId: 1 });

adminSchema.plugin(applyPlugins);

adminSchema.pre("save", async function (next) {
    if (!this.isNew) return next();

    this.admin_code = await generateCode("admin_code", "AD", 3);

    next();
});

export const Admin = mongoose.model<IAdmin>("Admin", adminSchema);