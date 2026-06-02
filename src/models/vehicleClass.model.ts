import mongoose, { Document, Schema } from "mongoose";
import { applyPlugins } from "./global/model.plugin";
import { generateCode } from "./counter.model";

export interface IVehicleClass extends Document {
  class_code: string;
  class_name: string;
  description?: string;
  supported_cars?: string[];
}

const vehicleClassSchema = new Schema<IVehicleClass>(
    {
        class_code: {
            type: String,
            required: true,
            unique: true,
        },

        class_name: {
            type: String,
            required: true,
            unique: true,
        },

        description: {
            type: String,
            default: null,
        },

        supported_cars: {
            type: [String],
            default: [],
        },
    },
    {
        timestamps: true,
    }
);

vehicleClassSchema.plugin(applyPlugins);

vehicleClassSchema.pre("save", async function (next) {
    if (!this.isNew) return next();

    this.class_code = await generateCode("class_code", "CLASS", 8);

    next();
});

export const VehicleClass = mongoose.model<IVehicleClass>("VehicleClass", vehicleClassSchema);