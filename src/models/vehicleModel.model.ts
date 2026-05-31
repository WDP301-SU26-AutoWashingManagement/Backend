import mongoose, { Document, Schema, Types } from "mongoose";

export interface IVehicleModel extends Document {
    make_id: Types.ObjectId;
    model_name: string;
}

const vehicleModelSchema = new Schema<IVehicleModel>(
    {
        make_id: {
            type: Schema.Types.ObjectId,
            ref: "Make",
            required: true,
        },

        model_name: {
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

export const VehicleModel = mongoose.model<IVehicleModel>("VehicleModel", vehicleModelSchema);