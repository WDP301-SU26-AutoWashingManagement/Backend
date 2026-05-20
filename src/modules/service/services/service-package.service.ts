import { FilterQuery, PaginateResult } from 'mongoose';
import { IServicePackage } from '../../../models/servicePackage.model';
import { servicePackageRepository } from '../repositories/service-package.repository';
import {
    ICreateServicePackage,
    IUpdateServicePackage,
    IToggleActive,
    IGetServicePackageList,
} from '../interfaces/service.interface';
import {
    ConflictError,
    NotFoundError,
    BadRequestError,
} from '../../../common/utils/AppError';

export type ServicePackageResponse = { servicePackage: IServicePackage };

class ServicePackageService {
    private readonly servicePackageRepo = servicePackageRepository;

    // ─────────────────────────────────────────────
    // POST /service-packages
    // ─────────────────────────────────────────────
    async createServicePackage(dto: ICreateServicePackage): Promise<ServicePackageResponse> {
        const exists = await this.servicePackageRepo.findByName(dto.service_name);
        if (exists) {
            throw new ConflictError(
                `Service package with name "${dto.service_name}" already exists`,
            );
        }

        const servicePackage = await this.servicePackageRepo.create({
            ...dto,
            service_name: dto.service_name.trim(),
        });

        return { servicePackage };
    }

    // ─────────────────────────────────────────────
    // GET /service-packages
    // ─────────────────────────────────────────────
    async getServicePackageList(
        dto: IGetServicePackageList,
    ): Promise<PaginateResult<IServicePackage>> {
        const { page = 1, limit = 10, is_active, search } = dto;

        const filter: FilterQuery<IServicePackage> = {};

        if (is_active !== undefined) filter.is_active = is_active;

        if (search) {
            filter.service_name = { $regex: search.trim(), $options: 'i' };
        }

        return this.servicePackageRepo.paginateList(filter, { page, limit });
    }

    // ─────────────────────────────────────────────
    // GET /service-packages/:id
    // ─────────────────────────────────────────────
    async getServicePackageById(id: string): Promise<ServicePackageResponse> {
        const servicePackage = await this.servicePackageRepo.findById(id);
        if (!servicePackage) throw new NotFoundError('Service package not found');
        return { servicePackage };
    }

    // ─────────────────────────────────────────────
    // PATCH /service-packages/:id
    // ─────────────────────────────────────────────
    async updateServicePackage(
        id: string,
        dto: IUpdateServicePackage,
    ): Promise<ServicePackageResponse> {
        const servicePackage = await this.servicePackageRepo.findById(id);
        if (!servicePackage) throw new NotFoundError('Service package not found');

        if (dto.service_name && dto.service_name.trim() !== servicePackage.service_name) {
            const nameConflict = await this.servicePackageRepo.findByName(dto.service_name);
            if (nameConflict) {
                throw new ConflictError(
                    `Service package with name "${dto.service_name}" already exists`,
                );
            }
        }

        const updated = await this.servicePackageRepo.updateById(id, { $set: dto });
        if (!updated) throw new NotFoundError('Service package not found');

        return { servicePackage: updated };
    }

    // ─────────────────────────────────────────────
    // PATCH /service-packages/:id/toggle-active
    // ─────────────────────────────────────────────
    async toggleActive(id: string, dto: IToggleActive): Promise<ServicePackageResponse> {
        const servicePackage = await this.servicePackageRepo.findById(id);
        if (!servicePackage) throw new NotFoundError('Service package not found');

        const updated = await this.servicePackageRepo.updateById(id, {
            $set: { is_active: dto.is_active },
        });
        if (!updated) throw new NotFoundError('Service package not found');

        return { servicePackage: updated };
    }

    // ─────────────────────────────────────────────
    // DELETE /service-packages/:id
    // ─────────────────────────────────────────────
    async deleteServicePackage(id: string): Promise<void> {
        const servicePackage = await this.servicePackageRepo.findById(id);
        if (!servicePackage) throw new NotFoundError('Service package not found');

        if (servicePackage.is_active) {
            throw new BadRequestError(
                'Cannot delete an active service package. Deactivate it first.',
            );
        }

        await this.servicePackageRepo.deleteById(id);
    }
}

// Singleton instance — không new ở nơi khác
export const servicePackageService = new ServicePackageService();