import { Request, Response, NextFunction } from 'express';
import { staffAbsentRequestService } from '../services/staff-manager.service';
import { sendSuccess } from '../../../common/utils/apiResponse';
import { AuthenticatedRequest } from '../../../common/types';
import { staffRepository } from '../repositories/staff.repository';
import { StaffRole } from '@common/types/enum';
import { AppError, ForbiddenError, NotFoundError } from '@common/utils/AppError';

export class StaffAbsentRequestController {
    private readonly service = staffAbsentRequestService;
    private readonly staffRepo = staffRepository;

    // ─── STAFF CREATE REQUEST ─────────────────────────────
    createRequest = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const staffId = (req as AuthenticatedRequest).user.id;
            const result = await this.service.createRequest(staffId, req.body);
            sendSuccess(res, result, 'Tạo đơn nghỉ thành công');
        } catch (error) {
            next(error);
        }
    }

    // ─── STAFF VIEW OWN REQUESTS ──────────────────────────
    getMyRequests = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const staffId = (req as AuthenticatedRequest).user.id;
            const result = await this.service.getStaffRequests(staffId);
            sendSuccess(res, result, 'Lấy danh sách đơn thành công');
        } catch (error) {
            next(error);
        }
    }

    // ─── MANAGER VIEW PENDING REQUESTS ────────────────────
    getPendingRequests = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const staffId = (req as AuthenticatedRequest).user.id
            const result = await this.service.getPendingRequests(staffId);
            sendSuccess(res, result, 'Lấy danh sách đơn chờ duyệt');
        } catch (error) {
            next(error);
        }
    }

    // ─── MANAGER VIEW REJECTED REQUESTS ───────────────────
    getRejectedRequests = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const staffId = (req as AuthenticatedRequest).user.id
            const result = await this.service.getRejectedRequests(staffId);
            sendSuccess(res, result, 'Lấy danh sách đơn từ chối');
        } catch (error) {
            next(error);
        }
    }

    // ─── MANAGER REVIEW REQUEST ───────────────────────────
    reviewRequest = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const managerId = (req as AuthenticatedRequest).user.id;
            const { requestId } = req.params;

            const result = await this.service.reviewRequest(
                managerId,
                requestId,
                req.body.status,
                req.body.note,
            );
            
            sendSuccess(res, result, 'Cập nhật trạng thái thành công');
        } catch (error) {
            next(error);
        }
    }

    getStaffOff = async (
        req: Request,
        res: Response,
        next: NextFunction,
    ) => {
        try {
            const managerId = (req as AuthenticatedRequest).user.id;

            const { from_date, to_date } = req.query;

            const result = await this.service.getStaffOff(
                managerId,
                from_date ? new Date(from_date as string) : undefined,
                to_date ? new Date(to_date as string) : undefined,
            );

            sendSuccess(
                res,
                result,
                'Lấy danh sách nhân viên nghỉ thành công',
            );
        } catch (error) {
            next(error);
        }
    };
}

export const staffAbsentRequestController = new StaffAbsentRequestController();