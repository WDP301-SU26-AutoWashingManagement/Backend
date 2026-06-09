import { iotService } from "../services/iot.service";
import { Response, NextFunction } from 'express';
import { sendSuccess } from "../../../common/utils/apiResponse";
import { AuthenticatedRequest } from "../../../common/types";

export class IOTController {
    async turnOnWater(req: AuthenticatedRequest, res: Response, next: NextFunction) {
        try {
            iotService.turnOnWaterPump();
            sendSuccess(res, null, "Water pump turned on successfully");    
        } catch (error) {
            next(error);
        }
    }
}

export const iotController = new IOTController();   