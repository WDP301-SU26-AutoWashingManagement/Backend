import { Request, Response, NextFunction } from 'express';
import { attendanceService } from '../services/attendance.service';
import { AuthenticatedRequest } from '../../../common/types';
import { NotFoundError, ForbiddenError } from '@common/utils/AppError';
import { IApiResponse } from '../dto/attendance.dto';

export class AttendanceController {
  private readonly attendanceService = attendanceService;

  /**
   * POST /api/attendance/check-in
   * Check-in cho một ca làm việc
   * Người thực hiện: Staff
   * Body: { schedule_id: string }
   */
  checkIn = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as AuthenticatedRequest).user.id;
      const { schedule_id } = req.body;

      if (!schedule_id) {
        const response: IApiResponse<null> = {
          success: false,
          code: 400,
          message: 'Check-in thất bại',
          error: 'schedule_id is required',
        };
        return res.status(400).json(response);
      }

      const result = await this.attendanceService.checkIn(userId, schedule_id);

      const response: IApiResponse<any> = {
        success: true,
        code: 200,
        message: result.message,
        data: result.attendance,
      };
      return res.status(200).json(response);
    } catch (error: any) {
      const statusCode =
        error instanceof NotFoundError ? 404 : error instanceof ForbiddenError ? 403 : 400;
      const response: IApiResponse<null> = {
        success: false,
        code: statusCode,
        message: 'Check-in thất bại',
        error: error.message,
      };
      return res.status(statusCode).json(response);
    }
  };

  /**
   * POST /api/attendance/check-out
   * Check-out cho một ca làm việc
   * Người thực hiện: Staff
   * Body: { schedule_id: string }
   */
  checkOut = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as AuthenticatedRequest).user.id;
      const { schedule_id } = req.body;

      if (!schedule_id) {
        const response: IApiResponse<null> = {
          success: false,
          code: 400,
          message: 'Check-out thất bại',
          error: 'schedule_id is required',
        };
        return res.status(400).json(response);
      }

      const result = await this.attendanceService.checkOut(userId, schedule_id);

      const response: IApiResponse<any> = {
        success: true,
        code: 200,
        message: result.message,
        data: result.attendance,
      };
      return res.status(200).json(response);
    } catch (error: any) {
      const statusCode =
        error instanceof NotFoundError ? 404 : error instanceof ForbiddenError ? 403 : 400;
      const response: IApiResponse<null> = {
        success: false,
        code: statusCode,
        message: 'Check-out thất bại',
        error: error.message,
      };
      return res.status(statusCode).json(response);
    }
  };

  /**
   * GET /api/attendance/me
   * Lấy lịch sử chấm công của bản thân
   * Người thực hiện: Staff
   */
  getMyAttendance = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as AuthenticatedRequest).user.id;
      const data = await this.attendanceService.getMyAttendance(userId);

      const response: IApiResponse<any> = {
        success: true,
        code: 200,
        message: 'Get attendance history successfully',
        data,
      };
      return res.status(200).json(response);
    } catch (error: any) {
      const statusCode = error instanceof NotFoundError ? 404 : 400;
      const response: IApiResponse<null> = {
        success: false,
        code: statusCode,
        message: 'Failed to get attendance history',
        error: error.message,
      };
      return res.status(statusCode).json(response);
    }
  };

  /**
   * GET /api/attendance/schedule/:scheduleId
   * Lấy danh sách chấm công theo ca
   * Người thực hiện: Manager
   */
  getBySchedule = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const managerId = (req as AuthenticatedRequest).user.id;
      const { scheduleId } = req.params;

      const data = await this.attendanceService.getByScheduleId(managerId, scheduleId);

      const response: IApiResponse<any> = {
        success: true,
        code: 200,
        message: 'Get attendance by schedule successfully',
        data,
      };
      return res.status(200).json(response);
    } catch (error: any) {
      const statusCode = error instanceof NotFoundError ? 404 : 400;
      const response: IApiResponse<null> = {
        success: false,
        code: statusCode,
        message: 'Failed to get attendance by schedule',
        error: error.message,
      };
      return res.status(statusCode).json(response);
    }
  };

  /**
   * GET /api/attendance/branch/:branchId
   * Lấy danh sách chấm công theo chi nhánh
   * Người thực hiện: Manager/Admin
   */
  getByBranch = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { branchId } = req.params;
      const data = await this.attendanceService.getByBranch(branchId);

      const response: IApiResponse<any> = {
        success: true,
        code: 200,
        message: 'Get attendance by branch successfully',
        data,
      };
      return res.status(200).json(response);
    } catch (error: any) {
      const response: IApiResponse<null> = {
        success: false,
        code: 400,
        message: 'Failed to get attendance by branch',
        error: error.message,
      };
      return res.status(400).json(response);
    }
  };
}

export const attendanceController = new AttendanceController();