import { FilterQuery, PaginateOptions, PaginateResult } from 'mongoose';
import { BaseRepository } from '../../../common/repositories/base.repository';
import { IServiceGroup, ServiceGroup } from 'src/models/serviceGroup.model';

export class ServiceGroupRepository extends BaseRepository<IServiceGroup> {
    constructor() {
        super(ServiceGroup);
    }

    findByName(name: string): Promise<IServiceGroup | null> {
        return this.model
            .findOne({ group_name: { $regex: `^${name.trim()}$`, $options: 'i' } })
            .exec();
    }

    paginateList(
        filter: FilterQuery<IServiceGroup>,
        options: PaginateOptions,
    ): Promise<PaginateResult<IServiceGroup>> {
        return this.paginate(filter, {
            ...options,
            sort: { group_code: 1 },
        });
    }
}

export const serviceGroupRepository = new ServiceGroupRepository(); // Singleton instance