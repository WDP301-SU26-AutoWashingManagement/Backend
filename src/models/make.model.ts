import mongoose, { Document, Schema } from "mongoose";

export interface IMake extends Document {
    make_name: string;
}

const makeSchema = new Schema<IMake>(
    {
        make_name: {
            type: String,
            required: true,
            unique: true,
            trim: true,
        },
    },
    {
        timestamps: true,
    }
);

export const Make = mongoose.model<IMake>("Make", makeSchema);