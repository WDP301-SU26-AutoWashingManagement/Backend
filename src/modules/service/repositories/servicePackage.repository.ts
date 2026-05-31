import { FilterQuery, PaginateOptions, PaginateResult } from 'mongoose';
import { ServicePackage, IServicePackage } from '../../../models/servicePackage.model';
import { BaseRepository } from '../../../common/repositories/base.repository';

export class ServicePackageRepository extends BaseRepository<IServicePackage> {
    constructor() {
        super(ServicePackage);
    }

    findByName(name: string): Promise<IServicePackage | null> {
        return this.model
            .findOne({ package_name: { $regex: `^${name.trim()}$`, $options: 'i' } })
            .exec();
    }

    paginateList(
        filter: FilterQuery<IServicePackage>,
        options: PaginateOptions,
    ): Promise<PaginateResult<IServicePackage>> {
        return this.paginate(filter, {
            ...options,
            sort: { package_code: 1 },
        });
    }
}

export const servicePackageRepository = new ServicePackageRepository(); // Singleton instance