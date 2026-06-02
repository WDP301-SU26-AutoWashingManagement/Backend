import mongoose, { Document, Schema, Types } from "mongoose";
import { applyPlugins } from "./global/model.plugin";
import { generateCode } from "./counter.model";

export interface IServicePackage extends Document {
    service_group_id: Types.ObjectId;
    package_name: string;
    package_code: string;
    description: string;
    package_discount_percentage: number;
    is_active: boolean;
}

const servicePackageSchema = new Schema<IServicePackage>(
    {   
        service_group_id: { 
            type: Schema.Types.ObjectId, 
            required: true, 
            ref: "ServiceGroup" 
        },
        
        package_name: {
            type: String,
            required: true,
        },

        package_code: {
            type: String,
            required: true,
            unique: true,
        },

        description: {
            type: String,
            required: true,
        },

        package_discount_percentage: {
            type: Number,
            required: true,
            default: 1          // default giảm 1% so với tổng giá services
        },

        is_active: {
            type: Boolean,
            required: true,
            default: true
        },
    },
    {
        timestamps: true,
    }
);

servicePackageSchema.plugin(applyPlugins);

servicePackageSchema.pre("save", async function (next) {
    if (!this.isNew) return next();

    this.package_code = await generateCode("package_code", "PACK", 8);

    next();
});

export const ServicePackage = mongoose.model<IServicePackage>("ServicePackage", servicePackageSchema);