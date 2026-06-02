import {vehicleClassRepository } from '../repositories/vehicleClass.repository';
import { ICreateVehicleClass, IUpdateVehicleClass } from '../interfaces/vehicleClass.interface';
import { FilterQuery, PaginateOptions, Types } from 'mongoose';
import { IVehicleClass } from '../../../models/vehicleClass.model';
import { BadRequestError, NotFoundError } from '../../../common/utils/AppError';

export class VehicleClassService {
    private readonly repository = vehicleClassRepository;

    async create(data: ICreateVehicleClass) {

        const existing = await this.repository.findOne({ class_name: data.class_name.toUpperCase().trim() });
        if (existing) {
            throw new BadRequestError('Loại kích cỡ này đã tồn tại');
        }
        const vehicleClass = await this.repository.create({
            ...data,
        });
        return this.repository.create(vehicleClass);
    }

    async findById(id: string) {
        const vehicle = await this.repository.findById(id);
        if (!vehicle) throw new NotFoundError('Loại kích cỡ không tìm thấy');
        return vehicle;
    }

    async updateById(id: string, data: IUpdateVehicleClass) {
        if (data.class_name) {
            const existing = await this.repository.findOne({ 
                license_plate: data.class_name.toUpperCase().trim(),
                _id: { $ne: id }
            });
            if (existing) throw new BadRequestError('Tên kích cỡ đã bị trùng');
        }
        const updated = await this.repository.updateById(id, data);
        if (!updated) throw new NotFoundError('Loại kích cỡ không tìm thấy');
        return updated;
    }

    async deleteById(id: string) {
        const deleted = await this.repository.deleteById(id);
        if (!deleted) throw new NotFoundError('Xe này không tìm thấy');
        return deleted;
    }

    async paginate(filter: FilterQuery<IVehicleClass>, opts: PaginateOptions) {
        return this.repository.paginate(filter, opts);
    }

    async findMany(filter: FilterQuery<IVehicleClass>) {
        return this.repository.findMany(filter);
    }
}

export const vehicleClassService = new VehicleClassService();