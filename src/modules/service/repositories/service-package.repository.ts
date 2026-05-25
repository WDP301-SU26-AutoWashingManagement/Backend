import { FilterQuery, PaginateOptions, PaginateResult } from 'mongoose';
import { ServicePackage, IServicePackage } from '../../../models/servicePackage.model';
import { BaseRepository } from '../../../common/repositories/base.repository';

export class ServicePackageRepository extends BaseRepository<IServicePackage> {
    constructor() {
        super(ServicePackage);
    }

    /**
     * Tìm service package theo tên (case-insensitive, dùng để kiểm tra trùng)
     */
    findByName(name: string): Promise<IServicePackage | null> {
        return this.model
            .findOne({ service_name: { $regex: `^${name.trim()}$`, $options: 'i' } })
            .exec();
    }

    /**
     * Phân trang danh sách service package với sort mặc định theo created_at
     */
    paginateList(
        filter: FilterQuery<IServicePackage>,
        options: PaginateOptions,
    ): Promise<PaginateResult<IServicePackage>> {
        return this.paginate(filter, {
            ...options,
            sort: { created_at: -1 },
        });
    }
}

export const servicePackageRepository = new ServicePackageRepository(); // Singleton instance