import { FilterQuery, PaginateResult, Types } from 'mongoose';
import { IServicePackage } from '../../../models/servicePackage.model';
import {
    ICreateServicePackage,
    IUpdateServicePackage,
    IToggleActive,
    IGetServicePackageList,
} from '../interfaces/servicePackage.interface';
import {
    ConflictError,
    NotFoundError,
    BadRequestError,
} from '../../../common/utils/AppError';
import { servicePackageRepository } from '../repositories/servicePackage.repository';
import { packageServiceRepository } from '../repositories/packageService.repository';

export type ServicePackageResponse = { servicePackage: IServicePackage };

class ServicePackageService {
    private readonly servicePackageRepo = servicePackageRepository;
    private readonly packageServiceRepo = packageServiceRepository;

    async createServicePackage(
        dto: ICreateServicePackage,
    ): Promise<ServicePackageResponse> {
        const normalizedName = dto.package_name.trim();

        const exists = await this.servicePackageRepo.findByName(
            normalizedName,
        );

        if (exists) {
            throw new ConflictError(
                `Gói có tên "${dto.package_name}" đã tồn tại`,
            );
        }

        const servicePackage =
            await this.servicePackageRepo.create({
                ...dto,
                package_name: normalizedName,
                service_group_id: new Types.ObjectId(dto.service_group_id)
            });

        return { servicePackage };
    }

    async getServicePackageList(
        dto: IGetServicePackageList,
    ): Promise<PaginateResult<IServicePackage>> {
        const { page = 1, limit = 10, is_active, search } = dto;

        const filter: FilterQuery<IServicePackage> = {};

        if (is_active !== undefined) filter.is_active = is_active;

        if (search) {
            filter.package_name = { $regex: search.trim(), $options: 'i' };
        }

        return this.servicePackageRepo.paginateList(filter, { page, limit });
    }


    async getServicePackageById(id: string): Promise<ServicePackageResponse> {
        const servicePackage = await this.servicePackageRepo.findById(id);
        if (!servicePackage) throw new NotFoundError('Gói không tìm thấy');
        return { servicePackage };
    }

    async updateServicePackage(
        id: string,
        dto: IUpdateServicePackage,
    ): Promise<ServicePackageResponse> {
        const servicePackage =
            await this.servicePackageRepo.findById(id);

        if (!servicePackage) {
            throw new NotFoundError(
                'Gói không tìm thấy',
            );
        }

        const normalizedName =
            dto.package_name?.trim();

        if (
            normalizedName &&
            normalizedName !== servicePackage.package_name
        ) {
            const nameConflict =
                await this.servicePackageRepo.findByName(
                    normalizedName,
                );

            if (nameConflict) {
                throw new ConflictError(
                    `ServicePackage with name "${normalizedName}" already exists`,
                );
            }
        }

        const updated =
            await this.servicePackageRepo.updateById(id, {
                $set: {
                    ...dto,
                    ...(normalizedName && {
                        package_name: normalizedName,
                    }),
                },
            });

        if (!updated) {
            throw new NotFoundError(
                'ServicePackage not found',
            );
        }

        return { servicePackage: updated };
    }

    async toggleActive(id: string, dto: IToggleActive): Promise<ServicePackageResponse> {
        const servicePackage = await this.servicePackageRepo.findById(id);
        if (!servicePackage) throw new NotFoundError('ServicePackage not found');

        const updated = await this.servicePackageRepo.updateById(id, {
            $set: { is_active: dto.is_active },
        });
        if (!updated) throw new NotFoundError('Gói không tìm thấy');

        return { servicePackage: updated };
    }

    async deleteServicePackage(id: string): Promise<void> {
        const servicePackage = await this.servicePackageRepo.findById(id);
        if (!servicePackage) throw new NotFoundError('Gói không tìm thấy');

        if (servicePackage.is_active) {
            throw new BadRequestError(
                'Không thể xóa gói dịch vụ',
            );
        }

        await this.servicePackageRepo.deleteById(id);
    }

    async listAllServiceByPackageId(packageId: string) {
        const servicePackage =
            await this.servicePackageRepo.findById(packageId);

        if (!servicePackage) {
            throw new NotFoundError('Gói không tìm thấy');
        }

        const packageServices =
            await this.packageServiceRepo.findByPackageId(packageId);

        return packageServices.map(
            (item) => item.service_id
        );
    }
}

// Singleton instance — không new ở nơi khác
export const servicePackageService = new ServicePackageService();