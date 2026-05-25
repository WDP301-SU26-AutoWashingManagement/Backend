import mongoose, { Document, Schema } from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';

// ERD: ServiceVersion { version_id PK, service_package_id FK → ServicePackage,
//                       version_number, service_details JSON,
//                       start_at, end_at }

export interface IServiceVersion extends Document {
  service_package_id: mongoose.Types.ObjectId;
  version_number: number;
  service_details: Record<string, unknown>;
  start_at: Date;
  end_at?: Date;
  created_at: Date;
  updated_at: Date;
}

const serviceVersionSchema = new Schema<IServiceVersion>(
  {
    service_package_id: { type: Schema.Types.ObjectId, ref: 'ServicePackage', required: true },
    version_number:     { type: Number, required: true },
    service_details:    { type: Schema.Types.Mixed, default: {} },
    start_at:           { type: Date, required: true },
    end_at:             { type: Date, default: null },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } },
);

serviceVersionSchema.index({ service_package_id: 1, version_number: -1 });

serviceVersionSchema.plugin(mongoosePaginate);

export const ServiceVersion = mongoose.model<IServiceVersion>('ServiceVersion', serviceVersionSchema);
