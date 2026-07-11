import { iotService } from "../services/iot.service";
import { Response, NextFunction } from 'express';
import { sendSuccess } from "../../../common/utils/apiResponse";
import { AuthenticatedRequest } from "../../../common/types";
import { ActionType } from "@modules/sse-notifications/interfaces/washingStatus.interface";
import { redisService } from "@modules/redis/services/redis.service";
import { checkInAppointment } from "@modules/check-in/services/checkin.service";
import { bookingService } from "@modules/booking/services/booking.service";

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

                // Check in the appointment
                const updated = await checkInAppointment(result.appointment._id.toString());

                if (!updated) {
                    return res.status(404).json({
                        success: false,
                        message: 'Cập nhật trạng thái thất bại.',
                    });
                }

                // Start service, store booking ID, and set status to WASHING
                await bookingService.startService(result.appointment._id.toString());
                await redisService.updateWashingStatus(branchId, ActionType.WASHING);

                // Call to machine at {branchId} branch
                await iotService.turnOnWaterPump(branchId);
            }
            sendSuccess(res, null, "Water pump turned on successfully");
        } catch (error) {
            next(error);
        }
    }

    async stopWashing(req: AuthenticatedRequest, res: Response, next: NextFunction) {
        try {
            const { branchId } = req.body;
            if (!branchId) {
                return res.status(400).json({ success: false, message: 'Không nhận diện được chi nhánh.' });
            }

            await redisService.updateWashingStatus(branchId, ActionType.PREPAIRING);

            sendSuccess(res, null, "Water pump turned off successfully");
        } catch (error) {
            next(error);
        }
    }
}

export const iotController = new IOTController();   