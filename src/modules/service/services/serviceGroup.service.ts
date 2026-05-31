import { FilterQuery, PaginateResult } from 'mongoose';
import { serviceGroupRepository } from '../repositories/serviceGroup.repository';
import {
    ICreateServiceGroup,
    IUpdateServiceGroup,
    IToggleActive,
    IGetServiceGroupList,
} from '../interfaces/serviceGroup.interface';
import {
    ConflictError,
    NotFoundError,
    BadRequestError,
} from '../../../common/utils/AppError';
import { IServiceGroup } from 'src/models/serviceGroup.model';

class ServiceGroupService {
    private readonly serviceGroupRepo = serviceGroupRepository;

    async createServiceGroup(dto: ICreateServiceGroup, userId: string) {
        const normalizedName = dto.group_name.trim();
        const exists =  await this.serviceGroupRepo.findByName(normalizedName);

        if (exists) {
            throw new ConflictError(
                `Service group with name "${dto.group_name}" already exists`,
            );
        }

        const serviceGroup = await this.serviceGroupRepo.create({
            ...dto,
            group_name: dto.group_name.trim(),
        });

        return { serviceGroup };
    }

    async getServiceGroupList(
        dto: IGetServiceGroupList,
    ): Promise<PaginateResult<IServiceGroup>> {
        const { page = 1, limit = 10, is_active, search } = dto;

        const filter: FilterQuery<IServiceGroup> = {};

        if (is_active !== undefined) filter.is_active = is_active;

        if (search) {
            filter.group_name = { $regex: search.trim(), $options: 'i' };
        }

        return this.serviceGroupRepo.paginateList(filter, { page, limit });
    }

    async getServiceGroupById(id: string) {
        const serviceGroup = await this.serviceGroupRepo.findById(id);
        if (!serviceGroup) throw new NotFoundError('Service group not found');
        return { serviceGroup };
    }

    async updateServiceGroup(
        id: string,
        dto: IUpdateServiceGroup,
    ) {
        const serviceGroup = await this.serviceGroupRepo.findById(id);

        if (!serviceGroup) {
            throw new NotFoundError('Service package not found');
        }

        const normalizedName = dto.group_name?.trim();

        if (normalizedName && normalizedName !== serviceGroup.group_name) {
            const nameConflict = await this.serviceGroupRepo.findByName(normalizedName);

            if (nameConflict) {
                throw new ConflictError(
                    `Service group with name "${normalizedName}" already exists`,
                );
            }
        }

        const updated = await this.serviceGroupRepo.updateById(id, {
            $set: {
                ...dto,
                ...(normalizedName && { group_name: normalizedName }),
            },
        });

        if (!updated) {
            throw new NotFoundError('Service group not found');
        }

        return { group: updated };
    }

    async toggleActive(id: string, dto: IToggleActive) {
        const serviceGroup = await this.serviceGroupRepo.findById(id);
        if (!serviceGroup) throw new NotFoundError('Service group not found');

        const updated = await this.serviceGroupRepo.updateById(id, {
            $set: { is_active: dto.is_active },
        });
        if (!updated) throw new NotFoundError('Service group not found');

        return { group: updated };
    }

    async deleteServiceGroup(id: string): Promise<void> {
        const serviceGroup = await this.serviceGroupRepo.findById(id);
        if (!serviceGroup) throw new NotFoundError('Service group not found');

        if (serviceGroup) {
            throw new BadRequestError(
                'Cannot delete an active service group. Deactivate it first.',
            );
        }

        await this.serviceGroupRepo.deleteById(id);
    }
}

// Singleton instance — không new ở nơi khác
export const serviceGroupService = new ServiceGroupService();