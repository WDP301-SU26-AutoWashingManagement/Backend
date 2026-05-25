import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { ServicePackage } from '../../../models/servicePackage.model';
import { Vehicle } from '../../../models/vehicle.model';
import { AppError } from '../../../common/utils/AppError';

export const validateServicePackageForBooking = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { service_package_id, vehicle_id } = req.body;

    if (!service_package_id || !vehicle_id) {
      throw new AppError('service_package_id and vehicle_id are required', 400);
    }

    if (
      !mongoose.Types.ObjectId.isValid(service_package_id) ||
      !mongoose.Types.ObjectId.isValid(vehicle_id)
    ) {
      throw new AppError('Invalid id format', 400);
    }

    const servicePackage = await ServicePackage.findById(service_package_id);
    if (!servicePackage) {
      throw new AppError('Service package not found', 404);
    }

    if (!servicePackage.is_active) {
      throw new AppError('Service package is not active', 400);
    }

    const vehicle = await Vehicle.findById(vehicle_id);
    if (!vehicle) {
      throw new AppError('Vehicle not found', 404);
    }

    if (vehicle.vehicle_type !== servicePackage.vehicle_type) {
      throw new AppError(
        `Vehicle type (${vehicle.vehicle_type}) does not match service package (${servicePackage.vehicle_type})`,
        400
      );
    }

    // attach for later use
    (req as any).servicePackage = servicePackage;
    (req as any).vehicle = vehicle;

    next();
  } catch (error) {
    next(error);
  }
};