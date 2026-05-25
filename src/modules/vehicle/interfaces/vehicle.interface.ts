//vehicle.interface.ts
import { Types } from 'mongoose';
import { VehicleType } from '../../../models/vehicle.model';

export interface CreateVehicleDto {
  customer_id: string | Types.ObjectId;
  plate_number: string;
  brand: string;
  vehicle_model: string;
  vehicle_type: VehicleType;
}

export interface UpdateVehicleDto {
  plate_number?: string;
  brand?: string;
  vehicle_model?: string;
  vehicle_type?: VehicleType;
}