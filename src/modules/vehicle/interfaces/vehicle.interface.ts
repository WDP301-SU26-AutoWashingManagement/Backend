import { Types } from "mongoose";

export interface CreateVehicleDto {
  vehicle_class_id: string;
  customer_id: string;
  model_id: string;

  license_plate: string;

  vehicle_model: string;

  fuel_type: string;
  color: string;
}

export interface UpdateVehicleDto {
  vehicle_class_id?: string;
  model_id?: string;
  license_plate?: string;

  brand?: string;
  vehicle_model?: string;

  fuel_type?: string;
  color?: string;
}