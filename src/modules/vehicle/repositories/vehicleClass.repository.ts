import { BaseRepository } from '../../../common/repositories/base.repository';
import { VehicleClass, IVehicleClass } from '../../../models/vehicleClass.model';

export class VehicleClassRepository extends BaseRepository<IVehicleClass> {
  constructor() {
    super(VehicleClass);
  }
}

export const vehicleClassRepository = new VehicleClassRepository();