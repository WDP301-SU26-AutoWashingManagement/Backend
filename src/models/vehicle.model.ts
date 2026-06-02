import mongoose, { Document, Schema, Types } from "mongoose";
import { applyPlugins } from "./global/model.plugin";

export interface IVehicle extends Document {
    vehicle_class_id: Types.ObjectId;
    customer_id: Types.ObjectId;
    model_id: Types.ObjectId;

    license_plate: string;

    vehicle_model: string;

    fuel_type: string;
    color: string;
}

const vehicleSchema = new Schema<IVehicle>(
    {
        vehicle_class_id: {
            type: Schema.Types.ObjectId,
            ref: "VehicleClass",
            required: true,
        },

        customer_id: {
            type: Schema.Types.ObjectId,
            ref: "Customer",
            required: true,
        },

        model_id: {
            type: Schema.Types.ObjectId,
            ref: "Model",
            required: true,
        },

        license_plate: {
            type: String,
            required: true,
            unique: true,
        },

        vehicle_model: {
            type: String,
            required: true,
        },

        fuel_type: {
            type: String,
            required: true,
        },

        color: {
            type: String,
            required: true,
        },
    },
    {
        timestamps: true,
    }
);

vehicleSchema.plugin(applyPlugins);

vehicleSchema.index({ customer_id: 1 });
vehicleSchema.index({ vehicle_class_id: 1 });

export const Vehicle = mongoose.model<IVehicle>("Vehicle", vehicleSchema);