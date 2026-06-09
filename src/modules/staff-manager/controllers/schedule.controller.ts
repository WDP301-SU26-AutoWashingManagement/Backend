import { Request, Response, NextFunction } from 'express';
import { sendSuccess } from '../../../common/utils/apiResponse';
import { AuthenticatedRequest } from '../../../common/types';
import { staffRepository } from '../repositories/staff.repository';
import { AppError, ForbiddenError, NotFoundError } from '@common/utils/AppError';
import { scheduleRepository } from '../repositories/schedule.repository';

export class ScheduleController {
    private readonly scheduleRepo = scheduleRepository;
    private readonly staffRepo = staffRepository;

    getAllSchedules = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const schedules = await this.scheduleRepo.findAll();
            return res.status(200).json({
                message: "Get all schedules successfully",
                data: schedules
            });
        } catch (err) {
            next(err);
        }
    };

    getScheduleById = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { id } = req.params;

            const schedule = await this.scheduleRepo.findById(id);

            if (!schedule) {
                return res.status(404).json({
                    message: "Schedule not found"
                });
            }

            return res.status(200).json({
                message: "Get schedule detail successfully",
                data: schedule
            });
        } catch (err) {
            next(err);
        }
    };
    
}

export const scheduleController = new ScheduleController();