import { Request, Response, NextFunction } from "express";
import { vehicleModelService } from "../services/vehicleModel.service";
import { sendSuccess } from "../../../common/utils/apiResponse";

export class VehicleModelController {
    private readonly service = vehicleModelService;

    getList = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const data = await this.service.getList();

            return sendSuccess(
                res,
                data,
                "Vehicle models retrieved successfully"
            );
        } catch (error) {
            next(error);
        }
    };

    getByName = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const data = await this.service.getByName(
                req.params.modelName
            );

            return sendSuccess(
                res,
                data,
                "Vehicle Model retrieved successfully"
            );
        } catch (error) {
            next(error);
        }
    };
}

export const vehicleModelController = new VehicleModelController();