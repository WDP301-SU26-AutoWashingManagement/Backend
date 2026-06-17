import { Request, Response, NextFunction } from 'express';
import { scheduleService } from '../services/schedule.service';
import { scheduleRepository } from '../repositories/schedule.repository';
import { staffRepository } from '../repositories/staff.repository';
import { AuthenticatedRequest } from '../../../common/types';
import { AppError, ForbiddenError, NotFoundError } from '@common/utils/AppError';
import { IApiResponse } from '../dto/schedule.dto';
import { StaffRole } from '../../../common/types/enum';

export class ScheduleController {
    private readonly scheduleRepo = scheduleRepository;
    private readonly staffRepo = staffRepository;
    private readonly scheduleService = scheduleService;

    /**
     * GET /api/schedules
     * Get all schedules
     */
    getAllSchedules = async (req: Request, res: Response, next: NextFunction) => {
        try {
        const schedules = await this.scheduleRepo.findAll();
        return res.status(200).json({
            message: 'Get all schedules successfully',
            data: schedules,
        });
        } catch (err) {
        next(err);
        }
    };

    /**
     * GET /api/schedules/:id
     * Get schedule by ID
     */
    getScheduleById = async (req: Request, res: Response, next: NextFunction) => {
        try {
        const { id } = req.params;

        const schedule = await this.scheduleRepo.findById(id);

        if (!schedule) {
            return res.status(404).json({
            message: 'Schedule not found',
            });
        }

        return res.status(200).json({
            message: 'Get schedule detail successfully',
            data: schedule,
        });
        } catch (err) {
        next(err);
        }
    };

    /**
     * POST /api/schedules/:scheduleId/add-staff
     * Add staff to schedule
     * Người thực hiện: Manager
     * Body: { staff_id: string }
     */
    addStaffToSchedule = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const userId = (req as AuthenticatedRequest).user.id;
            const { scheduleId } = req.params;
            const { staff_id } = req.body;

            if (!staff_id) {
            return res.status(400).json({
                success: false,
                code: 400,
                message: 'staff_id is required',
            });
            }

            const manager = await this.staffRepo.findByUserId(userId);

            if (!manager) {
            throw new NotFoundError('Không tìm thấy manager');
            }

            // if (manager.staff_type !== StaffRole.MANAGER) {
            // throw new ForbiddenError('User không có quyền manager');
            // }

            const result = await this.scheduleService.addStaffToSchedule(
                manager._id.toString(),
                scheduleId,
                staff_id
            );

            return res.status(200).json({
            success: true,
            code: 200,
            message: result.message,
            data: result.schedule,
            });

        } catch (error: any) {
            const statusCode =
            error instanceof NotFoundError ? 404 :
            error instanceof ForbiddenError ? 403 : 400;

            return res.status(statusCode).json({
            success: false,
            code: statusCode,
            message: 'Failed to add staff to schedule',
            error: error.message,
            });
        }
    };

    /**
     * POST /api/schedules/switch-staff
     * Switch two staff in different schedules
     * Người thực hiện: Manager
     * Body: {
     *   schedule_id_1: string,
     *   staff_id_1: string,
     *   schedule_id_2: string,
     *   staff_id_2: string
     * }
     */
    switchStaff = async (req: Request, res: Response, next: NextFunction) => {
        try {
        const managerId = (req as AuthenticatedRequest).user.id;
        const { schedule_id_1, staff_id_1, schedule_id_2, staff_id_2 } = req.body;

        // Validate input
        if (!schedule_id_1 || !staff_id_1 || !schedule_id_2 || !staff_id_2) {
            const response: IApiResponse<null> = {
            success: false,
            code: 400,
            message: 'Failed to switch staff',
            error: 'schedule_id_1, staff_id_1, schedule_id_2, and staff_id_2 are required',
            };
            return res.status(400).json(response);
        }

        const result = await this.scheduleService.switchStaff(
            managerId,
            schedule_id_1,
            staff_id_1,
            schedule_id_2,
            staff_id_2
        );

        const response: IApiResponse<any> = {
            success: true,
            code: 200,
            message: result.message,
            data: {
            schedule_1: result.schedule_1,
            schedule_2: result.schedule_2,
            },
        };

        return res.status(200).json(response);
        } catch (error: any) {
        const statusCode = error instanceof NotFoundError ? 404 : 
                            error instanceof ForbiddenError ? 403 : 400;
        const response: IApiResponse<null> = {
            success: false,
            code: statusCode,
            message: 'Failed to switch staff',
            error: error.message,
        };
        return res.status(statusCode).json(response);
        }
    };

    /**
     * GET /api/schedules/:staffId/leave-days
     * Get total leave days for a staff
     * Người thực hiện: Manager
     */
    getTotalLeaveDays = async (req: Request, res: Response, next: NextFunction) => {
        try {
        const managerId = (req as AuthenticatedRequest).user.id;
        const { staffId } = req.params;

        const result = await this.scheduleService.getTotalLeaveDays(managerId, staffId);

        const response: IApiResponse<any> = {
            success: true,
            code: 200,
            message: 'Get total leave days successfully',
            data: result,
        };

        return res.status(200).json(response);
        } catch (error: any) {
        const statusCode = error instanceof NotFoundError ? 404 : 
                            error instanceof ForbiddenError ? 403 : 400;
        const response: IApiResponse<null> = {
            success: false,
            code: statusCode,
            message: 'Failed to get total leave days',
            error: error.message,
        };
        return res.status(statusCode).json(response);
        }
    };

    /**
     * GET /api/schedules/cron-logs
     * Get recent cron logs
     * Người thực hiện: Manager
     */
    getCronLogs = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { CronLog } = await import('../../../models/cronLog.model');
            const logs = await CronLog.find().sort({ timestamp: 1 }).limit(100);
            
            const response: IApiResponse<any> = {
                success: true,
                code: 200,
                message: 'Get cron logs successfully',
                data: logs,
            };

            return res.status(200).json(response);
        } catch (error: any) {
            const response: IApiResponse<null> = {
                success: false,
                code: 500,
                message: 'Failed to get cron logs',
                error: error.message,
            };
            return res.status(500).json(response);
        }
    };
}

export const scheduleController = new ScheduleController();