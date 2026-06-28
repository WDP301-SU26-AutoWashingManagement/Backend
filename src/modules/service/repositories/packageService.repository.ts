import { Types } from 'mongoose';
import { PackageService, IPackageService } from '../../../models/packageService.model';
import { BaseRepository } from '../../../common/repositories/base.repository';

export class PackageServiceRepository extends BaseRepository<IPackageService> {
  constructor() {
    super(PackageService);
  }

  // ─── READ (replica) ────────────────────────────────────────────────────────

  findByPackageId(packageId: string) {
    return this.rm
      .find({ service_package_id: new Types.ObjectId(packageId) })
      .populate('service_id')
      .exec();
  }

  findByServiceId(serviceId: string) {
    return this.rm
      .find({ service_id: new Types.ObjectId(serviceId) })
      .populate('service_package_id')
      .exec();
  }

  findPackageService(packageId: string, serviceId: string) {
    return this.rm.findOne({
      service_package_id: packageId,
      service_id: serviceId,
    });
  }
}

export const packageServiceRepository = new PackageServiceRepository();