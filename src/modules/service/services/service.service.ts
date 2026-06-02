import { FilterQuery, PaginateResult } from 'mongoose';
import { IService } from '../../../models/service.model';
import { serviceRepository } from '../repositories/service.repository';
import {
    ICreateService,
    IUpdateService,
    IToggleActive,
    IGetServiceList,
} from '../interfaces/service.interface';
import {
    ConflictError,
    NotFoundError,
    BadRequestError,
} from '../../../common/utils/AppError';

export type ServiceResponse = { service: IService };

class ServiceService {
    private readonly serviceRepo = serviceRepository;

    async createService(dto: ICreateService, userId: string): Promise<ServiceResponse> {
        const normalizedName = dto.service_name.trim();
        const exists =  await this.serviceRepo.findByName(normalizedName);

        if (exists) {
            throw new ConflictError(
                `Service with name "${dto.service_name}" already exists`,
            );
        }

        const service = await this.serviceRepo.create({
            ...(dto as any),
            service_name: dto.service_name.trim(),
        });

        return { service };
    }

    async getServiceList(
        dto: IGetServiceList,
    ): Promise<PaginateResult<IService>> {
        const { page = 1, limit = 10, is_active, search } = dto;

        const filter: FilterQuery<IService> = {};

        if (is_active !== undefined) filter.is_active = is_active;

        if (search) {
            filter.service_name = { $regex: search.trim(), $options: 'i' };
        }

        return this.serviceRepo.paginateList(filter, { page, limit });
    }


    async getServiceById(id: string): Promise<ServiceResponse> {
        const service = await this.serviceRepo.findById(id);
        if (!service) throw new NotFoundError('Service not found');
        return { service };
    }

    async updateService(
        id: string,
        dto: IUpdateService,
    ): Promise<ServiceResponse> {
        const service = await this.serviceRepo.findById(id);

        if (!service) {
            throw new NotFoundError('Service not found');
        }

        const normalizedName = dto.service_name?.trim();

        if (normalizedName && normalizedName !== service.service_name) {
            const nameConflict = await this.serviceRepo.findByName(normalizedName);

            if (nameConflict) {
                throw new ConflictError(
                    `Service with name "${normalizedName}" already exists`,
                );
            }
        }

        const updated = await this.serviceRepo.updateById(id, {
            $set: {
                ...dto,
                ...(normalizedName && { service_name: normalizedName }),
            },
        });

        if (!updated) {
            throw new NotFoundError('Service not found');
        }

        return { service: updated };
    }

    async toggleActive(id: string, dto: IToggleActive): Promise<ServiceResponse> {
        const service = await this.serviceRepo.findById(id);
        if (!service) throw new NotFoundError('Service not found');

        const updated = await this.serviceRepo.updateById(id, {
            $set: { is_active: dto.is_active },
        });
        if (!updated) throw new NotFoundError('Service not found');

        return { service: updated };
    }

    async deleteService(id: string): Promise<void> {
        const service = await this.serviceRepo.findById(id);
        if (!service) throw new NotFoundError('Service not found');

        if (service.is_active) {
            throw new BadRequestError(
                'Cannot delete an active service. Deactivate it first.',
            );
        }

        await this.serviceRepo.deleteById(id);
    }
}

// Singleton instance — không new ở nơi khác
export const serviceService = new ServiceService();