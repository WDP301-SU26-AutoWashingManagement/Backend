// booking.controller.ts

import { Response, NextFunction } from 'express';
import { bookingService } from '../services/booking.service';
import { sendCreated, sendSuccess } from '../../../common/utils/apiResponse';
import { sendPaginated } from '../../../common/utils/paginated.helper';
import { AuthenticatedRequest } from '../../../common/types';
import {
    ICreateBooking,
    ICancelBooking,
    IGetBookingList,
    IUpdateBookingStatus,
    IFindByPlateNumber,
} from '../interfaces/booking.interface';
import { customerRoleRepository } from '@modules/userProfile/repositories/userProfile.repository';
import { NotFoundError } from '@common/utils/AppError';

export class BookingController {
    private readonly bookingService = bookingService;
    private readonly customerRepo = customerRoleRepository;

    create = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            const result = await this.bookingService.createBooking(
                req.user.id,
                req.body as ICreateBooking,
            );
            sendCreated(res, result, 'Đã tạo lịch hẹn rửa xe thành công');
        } catch (error) {
            next(error);
        }
    };

    cancel = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            const customer = await this.customerRepo.findByUserId(req.user.id)
            if (!customer){
                 throw new NotFoundError(`Customer not found for user "${req.user.id}"`);
            }
            
            const result = await this.bookingService.cancelBooking(
                req.params.id,
                customer._id,
                req.body as ICancelBooking,
            );
            sendSuccess(res, result, 'Đã hủy lịch hẹn');
        } catch (error) {
            next(error);
        }
    };

    getHistory = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            const customer = await this.customerRepo.findByUserId(req.user.id);
            if (!customer){
                 throw new NotFoundError(`Customer not found for user "${req.user.id}"`);
            }
            
            const result = await this.bookingService.getBookingList(
                req.query as unknown as IGetBookingList,
                req.user.role,
                customer._id.toString()
            );
            sendPaginated(res, result, 'Lấy danh sách lịch hẹn thành công');
        } catch (error) {
            next(error);
        }
    };

    getById = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            const result = await this.bookingService.getBookingById(
                req.params.id,
                req.user.id,
                req.user.role,
            );
            sendSuccess(res, result, 'Lấy chi tiết lịch hẹn thành công');
        } catch (error) {
            next(error);
        }
    };

    checkIn = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            const result = await this.bookingService.updateStatus(
                req.params.id,
                { status: 'checked_in' },
            );
            sendSuccess(res, result, 'Check-in thành công');
        } catch (error) {
            next(error);
        }
    };

    startWashing = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            const result = await this.bookingService.updateStatus(
                req.params.id,
                { status: 'in_progress' },
            );
            sendSuccess(res, result, 'Đang tiến hành rửa xe');
        } catch (error) {
            next(error);
        }
    };

    complete = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            const result = await this.bookingService.updateStatus(
                req.params.id,
                { status: 'completed' },
            );
            sendSuccess(res, result, 'Dịch vụ đã hoàn thành và tích điểm cho khách');
        } catch (error) {
            next(error);
        }
    };

    checkInByPlate = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            const booking = await this.bookingService.findBookingByPlateNumber(
                req.body as IFindByPlateNumber,
            );
            const result = await this.bookingService.updateStatus(
                booking._id.toString(),
                { status: 'checked_in' },
            );
            sendSuccess(res, {
                booking,
                customer: (booking as any).customer_id,
                vehicle:  (booking as any).vehicle_id,
            }, 'Check-in thành công');
        } catch (error) {
            next(error);
        }
    };
}

export const bookingController = new BookingController();