import { Types } from 'mongoose';

export interface CreateVehicleDto {
  customer_id: string | Types.ObjectId;
  plate_number: string;
  brand: string;
  vehicle_model: string;
}

export interface UpdateVehicleDto {
  plate_number?: string;
  brand?: string;
  vehicle_model?: string;
}
