import mongoose, { Schema, Document, Types } from "mongoose";
import { applyPlugins } from "./global/model.plugin";

export interface IBoss extends Document {
  user_id: Types.ObjectId;
}

const bossSchema = new Schema<IBoss>(
    {
        user_id: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
            unique: true, // 1 user chỉ có 1 boss profile
        },
    },
);

bossSchema.plugin(applyPlugins);


export const Boss = mongoose.model<IBoss>("Boss", bossSchema);