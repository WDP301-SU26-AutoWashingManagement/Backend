import mongoose, { Document, Schema, Types } from "mongoose";
import { applyPlugins } from "./global/model.plugin";

export interface IPackageService extends Document {
    service_id: Types.ObjectId;
    service_package_id: Types.ObjectId;
}

const packageServiceSchema = new Schema<IPackageService>(
    {   
        service_id: { 
            type: Schema.Types.ObjectId, 
            required: true, 
            ref: "Service" 
        },

        service_package_id: { 
            type: Schema.Types.ObjectId, 
            required: true, 
            ref: "ServicePackage" 
        },

    },
    {
        timestamps: true,
    }
);

packageServiceSchema.plugin(applyPlugins);

export const PackageService = mongoose.model<IPackageService>("PackageService", packageServiceSchema);