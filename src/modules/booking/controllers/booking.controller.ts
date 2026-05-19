import { Response, NextFunction } from 'express';
import { plainToInstance } from 'class-transformer';
import { BookingService } from '../services/booking.service';
import { sendCreated, sendSuccess } from '../../../common/utils/apiResponse';
import { sendPaginated } from '../../../common/utils/paginated.helper';
import { AuthenticatedRequest } from '../../../common/types';
import {
    CreateBookingDto,
    CancelBookingDto,
    GetBookingListDto,
    UpdateBookingStatusDto,
    FindByPlateNumberDto,
} from '../dtos/booking.dto';

export class BookingController {
    private bookingService = new BookingService();

    // ─────────────────────────────────────────────
    // POST /bookings
    // ─────────────────────────────────────────────
    create = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            const dto = plainToInstance(CreateBookingDto, req.body);
            const result = await this.bookingService.createBooking(req.user.id, dto);
            sendCreated(res, result, 'Đã tạo lịch hẹn rửa xe thành công');
        } catch (error) {
            next(error);
        }
    };

    // ─────────────────────────────────────────────
    // PATCH /bookings/:id/cancel
    // ─────────────────────────────────────────────
    cancel = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            const dto = plainToInstance(CancelBookingDto, req.body);
            const result = await this.bookingService.cancelBooking(req.params.id, req.user.id, dto);
            sendSuccess(res, result, 'Đã hủy lịch hẹn');
        } catch (error) {
            next(error);
        }
    };

    // ─────────────────────────────────────────────
    // GET /bookings
    // ─────────────────────────────────────────────
    getHistory = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            // plainToInstance chuyển query string → number nhờ @Type(() => Number) trong DTO
            const dto = plainToInstance(GetBookingListDto, req.query);
            const result = await this.bookingService.getBookingList(dto, req.user.role, req.user.id);
            sendPaginated(res, result, 'Lấy danh sách lịch hẹn thành công');
        } catch (error) {
            next(error);
        }
    };

    // ─────────────────────────────────────────────
    // GET /bookings/:id
    // ─────────────────────────────────────────────
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

    // ─────────────────────────────────────────────
    // POST /bookings/:id/confirm  (admin)
    // ─────────────────────────────────────────────
    confirm = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            const result = await this.bookingService.confirmBooking(req.params.id);
            sendSuccess(res, result, 'Đã xác nhận lịch hẹn');
        } catch (error) {
            next(error);
        }
    };

    // ─────────────────────────────────────────────
    // PATCH /bookings/:id/check-in  (staff)
    // ─────────────────────────────────────────────
    checkIn = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            const dto: UpdateBookingStatusDto = { status: 'checked_in' };
            const result = await this.bookingService.updateStatus(req.params.id, dto);
            sendSuccess(res, result, 'Check-in thành công');
        } catch (error) {
            next(error);
        }
    };

    // ─────────────────────────────────────────────
    // PATCH /bookings/:id/start  (staff)
    // ─────────────────────────────────────────────
    startWashing = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            const dto: UpdateBookingStatusDto = { status: 'in_progress' };
            const result = await this.bookingService.updateStatus(req.params.id, dto);
            sendSuccess(res, result, 'Đang tiến hành rửa xe');
        } catch (error) {
            next(error);
        }
    };

    // ─────────────────────────────────────────────
    // PATCH /bookings/:id/complete  (staff)
    // ─────────────────────────────────────────────
    complete = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            const dto: UpdateBookingStatusDto = { status: 'completed' };
            const result = await this.bookingService.updateStatus(req.params.id, dto);
            sendSuccess(res, result, 'Dịch vụ đã hoàn thành và tích điểm cho khách');
        } catch (error) {
            next(error);
        }
    };

    // ─────────────────────────────────────────────
    // POST /bookings/check-in/plate  (Scan plate number at gate automatically)
    // ─────────────────────────────────────────────
    checkInByPlate = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            const dto = plainToInstance(FindByPlateNumberDto, req.body);

            // 1. Tìm lịch hẹn đã confirmed theo biển số
            const booking = await this.bookingService.findBookingByPlateNumber(dto);

            // 2. Thực hiện check-in ngay sau khi tìm thấy
            const dto2: UpdateBookingStatusDto = { status: 'checked_in' };
            const result = await this.bookingService.updateStatus(booking._id.toString(), dto2);

            sendSuccess(res, {
                booking:  result,
                customer: (booking as any).customer_id,
                vehicle:  (booking as any).vehicle_id,
            }, 'Check-in thành công');
        } catch (error) {
            next(error);
        }
    };
}