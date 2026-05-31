import { IVehicleModel, VehicleModel } from 'src/models/vehicleModel.model';
import { BaseRepository } from '../../../common/repositories/base.repository';

export class VehicleModelRepository extends BaseRepository<IVehicleModel> {
    constructor() {
        super(VehicleModel);
    }

    findAll(): Promise<IVehicleModel[]> {
            return this.model
                .find()
                .sort({ modelName: 1 })
                .exec();
        }

    findByName(modelName: string): Promise<IVehicleModel | null> {
        return this.model
            .findOne({
                modelName: {
                    $regex: `^${modelName.trim()}$`,
                    $options: "i",
                },
            })
            .exec();
    }
}

export const vehicleModelRepository = new VehicleModelRepository();