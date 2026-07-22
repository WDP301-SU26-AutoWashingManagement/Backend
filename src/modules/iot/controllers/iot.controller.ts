import { iotService } from "../services/iot.service";
import { Response, NextFunction } from 'express';
import { sendSuccess } from "../../../common/utils/apiResponse";
import { AuthenticatedRequest } from "../../../common/types";
import { redisService } from "@modules/redis/services/redis.service";
import { checkInAppointment } from "@modules/check-in/services/checkin.service";
import { bookingService } from "@modules/booking/services/booking.service";
import { userProfileService } from "@modules/userProfile/services/userProfile.service";
import { ActionType } from "@modules/sse-notifications/interfaces/washingStatus.interface";

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
                const isIdle = await iotService.checkIdle(branchId);
                if (!isIdle) {
                    return res.status(400).json({
                        success: false,
                        message: 'Máy rửa xe đang bận.',
                    });
                }

                // Start service, store booking ID, and set status to WASHING
                await bookingService.startService(result.appointment._id.toString());
                await redisService.updateWashingStatus(branchId, ActionType.PRE_RINSE);

                // Call to machine at {branchId} branch with license plate
                await iotService.turnOnWaterPump(branchId, req.body.plate);
            }
            sendSuccess(res, null, "Water pump turned on successfully");
        } catch (error) {
            next(error);
        }
    }

    async stopWashing(req: AuthenticatedRequest, res: Response, next: NextFunction) {
        try {
            const { id: userId } = (req as AuthenticatedRequest).user;

            let branchId: string | undefined;

            try {
                branchId = await userProfileService.resolveUserBranch(userId);
            } catch (err) {
                console.error('IoT: failed to resolve user context', err);
            }

            if (!branchId) {
                return res.status(400).json({ success: false, message: 'Không nhận diện được chi nhánh.' });
            }

            // Just send OFF to Arduino — it will respond with "branchId|STOPPED"
            // and handleMessage in iot.service.ts handles rollback + IDLE reset
            await iotService.turnOffWaterPump(branchId);

            sendSuccess(res, null, "Water pump turned off successfully");
        } catch (error) {
            next(error);
        }
    }
}

export const iotController = new IOTController();   