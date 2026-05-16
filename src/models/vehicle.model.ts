import mongoose, { Document, Schema } from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';

export interface IVehicle extends Document {
  customer_id: mongoose.Types.ObjectId;
  plate_number: string;
  brand: string;
  vehicle_model: string;
  created_at: Date;
  updated_at: Date;
}

const vehicleSchema = new Schema<IVehicle>(
  {
    customer_id:  { type: Schema.Types.ObjectId, ref: 'Customer', required: true },
    plate_number: { type: String, required: true, unique: true, uppercase: true, trim: true },
    brand:        { type: String, required: true, trim: true },
    vehicle_model: { type: String, required: true, trim: true },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } },
);

vehicleSchema.index({ customer_id: 1 });
export const Vehicle = mongoose.model<IVehicle>('Vehicle', vehicleSchema);