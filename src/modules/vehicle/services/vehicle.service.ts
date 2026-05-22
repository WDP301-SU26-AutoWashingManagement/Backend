import { VehicleRepository, vehicleRepository} from '../repositories/vehicle.repository';
import { CreateVehicleDto, UpdateVehicleDto } from '../interfaces/vehicle.interface';
import { FilterQuery, PaginateOptions } from 'mongoose';
import { IVehicle } from '../../../models/vehicle.model';
import { AppError, BadRequestError, NotFoundError } from '../../../common/utils/AppError';
import { Customer } from '../../../models/customer.model';

export class VehicleService {
  private readonly repository = vehicleRepository;

  async create(data: CreateVehicleDto) {
    const customer = await Customer.findById(data.customer_id);
    if (!customer) {
      throw new NotFoundError('Customer not found');
    }

    const existing = await this.repository.findOne({ plate_number: data.plate_number.toUpperCase().trim() });
    if (existing) {
      throw new BadRequestError('Plate number already registered');
    }
    return this.repository.create(data as Partial<IVehicle>);
  }

  async findById(id: string) {
    const vehicle = await this.repository.findById(id);
    if (!vehicle) throw new NotFoundError('Vehicle not found');
    return vehicle;
  }

  async updateById(id: string, data: UpdateVehicleDto) {
    if (data.plate_number) {
      const existing = await this.repository.findOne({ 
        plate_number: data.plate_number.toUpperCase().trim(),
        _id: { $ne: id }
      });
      if (existing) throw new BadRequestError('Plate number already in use');
    }
    const updated = await this.repository.updateById(id, data);
    if (!updated) throw new NotFoundError('Vehicle not found');
    return updated;
  }

  async deleteById(id: string) {
    const deleted = await this.repository.deleteById(id);
    if (!deleted) throw new NotFoundError('Vehicle not found');
    return deleted;
  }

  async paginate(filter: FilterQuery<IVehicle>, opts: PaginateOptions) {
    return this.repository.paginate(filter, opts);
  }

  async findMany(filter: FilterQuery<IVehicle>) {
    return this.repository.findMany(filter);
  }
}

export const vehicleService = new VehicleService();