import mongoose, { Document, Schema } from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';

// ERD: ServicePackage { service_package_id PK, admin_id FK → Admin,
//                       service_name, description, service_price,
//                       duration_minutes, is_active, timestamps }

export interface IServicePackage extends Document {
  admin_id: mongoose.Types.ObjectId;
  service_name: string;
  description?: string;
  service_price: number;
  duration_minutes: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

const servicePackageSchema = new Schema<IServicePackage>(
  {
    admin_id:         { type: Schema.Types.ObjectId, ref: 'Admin', required: true },
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
