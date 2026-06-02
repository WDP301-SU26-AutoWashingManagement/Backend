import { vehicleModelRepository } from "../repositories/vehicleModel.repository";

class VehicleModelService {
    private readonly vehicleModelRepo = vehicleModelRepository;
    async getList() {
        return this.vehicleModelRepo.findAll();
    }

    async getByName(modelName: string) {
        return this.vehicleModelRepo.findByName(modelName);
    }
}

export const vehicleModelService = new VehicleModelService();