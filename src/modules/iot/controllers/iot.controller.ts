import { iotService } from "../services/iot.service";
import { Response, NextFunction } from 'express';
import { sendSuccess } from "../../../common/utils/apiResponse";
import { AuthenticatedRequest } from "../../../common/types";
import { notificationService } from '../../sse-notifications/services/notification.service';
import { User } from '../../../models/user.model';
import { ActionType } from "@modules/sse-notifications/interfaces/washingStatus.interface";
import { redisService } from "@modules/redis/services/redis.service";

export class IOTController {
    async turnOnWater(req: AuthenticatedRequest, res: Response, next: NextFunction) {
        try {
            // Get user to resolve branch_id
            const userId = req.user.id;
            const user = await User.findById(userId).lean();
            const branchId = user?.branch_id ? user.branch_id.toString() : '';

            // Turn on water pump (MQTT publication)
            await iotService.turnOnWaterPump();

            if (branchId) {
                // Set washing status in Redis to WASHING
                await redisService.updateWashingStatus(branchId, { id: branchId, action: ActionType.WASHING }, '');

                // Simulate status transition: WASHING -> DONE (after 15 seconds) -> PREPAIRING (after 20 seconds)
                setTimeout(async () => {
                    try {
                        await redisService.updateWashingStatus(branchId, { id: branchId, action: ActionType.DONE }, '');
                    } catch (err) {
                        console.error('Failed to update status to DONE:', err);
                    }
                }, 15000);

                setTimeout(async () => {
                    try {
                        await redisService.updateWashingStatus(branchId, { id: branchId, action: ActionType.PREPAIRING }, '');
                    } catch (err) {
                        console.error('Failed to update status to PREPAIRING:', err);
                    }
                }, 20000);
            }

            sendSuccess(res, null, "Water pump turned on successfully");    
        } catch (error) {
            next(error);
        }
    }
}

export const iotController = new IOTController();   