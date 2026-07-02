import { iotService } from "../services/iot.service";
import { Response, NextFunction } from 'express';
import { sendSuccess } from "../../../common/utils/apiResponse";
import { AuthenticatedRequest } from "../../../common/types";
import { User } from '../../../models/user.model';
import { ActionType } from "@modules/sse-notifications/interfaces/washingStatus.interface";
import { redisService } from "@modules/redis/services/redis.service";
import { checkInAppointment, findAppointmentByPlates } from "@modules/check-in/services/checkin.service";

export class IOTController {
    async washManual(req: AuthenticatedRequest, res: Response, next: NextFunction) {
        try {
            if (!req.body.plate) {
                return res.status(400).json({ success: false, message: 'Không nhận diện được biển số.' });
            }

            const result = await iotService.checkPlate(req.body.plate);

            if (typeof result === 'string') {
                return res.status(404).json({
                    success: false,
                    message: result,
                });
            }

            const branchId = result.appointment.branch_id.toString();

            if (branchId) {
                const isBusy = await iotService.checkPrepairing(branchId);
                if (!isBusy) {
                    return res.status(400).json({
                        success: false,
                        message: 'Máy rửa xe đang bận.',
                    });
                }

                // Set washing status in Redis to WASHING
                const updated = await checkInAppointment(result.appointment._id.toString());

                if (!updated) {
                    return res.status(404).json({
                        success: false,
                        message: 'Cập nhật trạng thái thất bại.',
                    });
                }

                await redisService.updateWashingStatus(branchId, { id: branchId, action: ActionType.WASHING }, '');

                //Call to machine at {branchId} branch
                await iotService.turnOnWaterPump(branchId);

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