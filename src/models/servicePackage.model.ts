import mongoose, { Document, Schema } from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';

export interface IServicePackage extends Document {
  service_name: string;
  description: string;
  service_price: number;
  duration_minutes: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}
const servicePackageSchema = new Schema<IServicePackage>(
  {
    service_name:     { type: String, required: true, trim: true },
    description:      { type: String, default: '' },
    service_price:    { type: Number, required: true, min: 0 },
    duration_minutes: { type: Number, required: true, min: 1 },
    is_active:        { type: Boolean, default: true },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } },
);

servicePackageSchema.plugin(mongoosePaginate);
export const ServicePackage = mongoose.model<IServicePackage>('ServicePackage', servicePackageSchema);