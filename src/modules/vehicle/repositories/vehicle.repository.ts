import { BaseRepository } from '../../../common/repositories/base.repository';
import { Vehicle, IVehicle } from '../../../models/vehicle.model';

export class VehicleRepository extends BaseRepository<IVehicle> {
  constructor() {
    super(Vehicle);
  }
}
