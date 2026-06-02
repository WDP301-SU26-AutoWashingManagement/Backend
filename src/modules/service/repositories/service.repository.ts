import { FilterQuery, PaginateOptions, PaginateResult } from 'mongoose';
import { Service, IService } from '../../../models/service.model';
import { BaseRepository } from '../../../common/repositories/base.repository';

export class ServiceRepository extends BaseRepository<IService> {
    constructor() {
        super(Service);
    }

    findByName(name: string): Promise<IService | null> {
        return this.model
            .findOne({ service_name: { $regex: `^${name.trim()}$`, $options: 'i' } })
            .exec();
    }

    paginateList(
        filter: FilterQuery<IService>,
        options: PaginateOptions,
    ): Promise<PaginateResult<IService>> {
        return this.paginate(filter, {
            ...options,
            sort: { service_code: 1 },
        });
    }
}

export const serviceRepository = new ServiceRepository(); // Singleton instance