import { vehicleRepository } from '../repositories/vehicle.repository';
import { CreateVehicleDto, UpdateVehicleDto } from '../interfaces/vehicle.interface';
import { FilterQuery, PaginateOptions, Types } from 'mongoose';
import { IVehicle } from '../../../models/vehicle.model';
import { AppError, BadRequestError, NotFoundError } from '../../../common/utils/AppError';
import { customerRoleRepository } from '@modules/userProfile/repositories/userProfile.repository';
import { vehicleClassRepository } from '../repositories/vehicleClass.repository';
import { Make } from '../../../models/make.model';
import { VehicleModel } from '../../../models/vehicleModel.model';

export class VehicleService {
  private readonly repository = vehicleRepository;
  private readonly customerRepo = customerRoleRepository;
  private readonly vehicleClassRepo = vehicleClassRepository;

  async create(data: CreateVehicleDto, userId: string) {
    const customer = await this.customerRepo.findByUserId(userId);
    if (!customer) {
      throw new NotFoundError('Khách hàng này chưa đăng ký');
    }

    const existing = await this.repository.findOne({ license_plate: data.license_plate.toUpperCase().trim() });
    if (existing) {
      throw new BadRequestError('Biển số xe đã đăng ký');
    }
    let finalModelId = data.model_id;
    if (!finalModelId || finalModelId === 'other') {
      const makeName = data.make_name?.trim() || 'Khác';
      const modelName = data.model_name?.trim() || 'Khác';

      const make = await Make.findOneAndUpdate(
        { make_name: makeName },
        { make_name: makeName },
        { upsert: true, new: true }
      );
      const model = await VehicleModel.findOneAndUpdate(
        { model_name: modelName, make_id: make._id },
        { make_id: make._id, model_name: modelName },
        { upsert: true, new: true }
      );
      finalModelId = model._id.toString();
    }

    if (!finalModelId || finalModelId === '') {
      throw new BadRequestError('Dòng xe không hợp lệ');
    }

    const vehicle = await this.repository.create({
      ...data,
      customer_id: customer._id,
      vehicle_class_id: new Types.ObjectId(data.vehicle_class_id),
      model_id: new Types.ObjectId(finalModelId),
    });
    return vehicle;
  }

  async findById(id: string) {
    const vehicle = await this.repository.findById(id);
    if (!vehicle) throw new NotFoundError('Xe này không tìm thấy');
    return vehicle;
  }

  async updateById(id: string, data: UpdateVehicleDto) {
    if (data.license_plate) {
      const existing = await this.repository.findOne({
        license_plate: data.license_plate.toUpperCase().trim(),
        _id: { $ne: id }
      });
      if (existing) throw new BadRequestError('Biển số xe đã đăng ký');
    }
    let finalModelId = data.model_id;
    if (finalModelId === 'other') {
      const makeName = data.make_name?.trim() || 'Khác';
      const modelName = data.model_name?.trim() || 'Khác';

      const make = await Make.findOneAndUpdate(
        { make_name: makeName },
        { make_name: makeName },
        { upsert: true, new: true }
      );
      const model = await VehicleModel.findOneAndUpdate(
        { model_name: modelName, make_id: make._id },
        { make_id: make._id, model_name: modelName },
        { upsert: true, new: true }
      );
      finalModelId = model._id.toString();
    }
    
    if (finalModelId && finalModelId !== 'other') {
      data.model_id = finalModelId;
    } else {
      delete data.model_id;
    }

    const updated = await this.repository.updateById(id, data);
    if (!updated) throw new NotFoundError('Xe này không tìm thấy');
    return updated;
  }

  async deleteById(id: string) {
    const deleted = await this.repository.deleteById(id);
    if (!deleted) throw new NotFoundError('Xe này không tìm thấy');
    return deleted;
  }

  async paginate(filter: FilterQuery<IVehicle>, opts: PaginateOptions) {
    return this.repository.paginate(filter, opts);
  }

  async findMany(filter: FilterQuery<IVehicle>) {
    return this.repository.findMany(filter);
  }

  // API tra class cho từng license plate
  // /vehicles/lookup-class
  async findClassById(vehicleId: string) {
    const vehicle = await this.findById(vehicleId);

    if (!vehicle) {
      throw new NotFoundError('Xe này không tìm thấy');
    }

    const vehicleClass = await this.vehicleClassRepo.findById(vehicle.vehicle_class_id.toString());

    return vehicleClass;
  }

  // API tra lịch sử bảo dưỡng xe
  // /vehicles/:id/service-history
  // API này sẽ được bổ sung sau khi có booking/appointment
}

export const vehicleService = new VehicleService();