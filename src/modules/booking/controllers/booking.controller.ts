import { Response, NextFunction } from 'express';
import { bookingService }     from '../services/booking.service';
import { iotService }         from '../../iot/services/iot.service';
import {
  sendCreated,
  sendSuccess,
} from '../../../common/utils/apiResponse';
import { sendPaginated }      from '../../../common/utils/paginated.helper';
import { AuthenticatedRequest } from '../../../common/types';
import {
  IAssignStaff,
  ICancelBooking,
  IConfirmBooking,
  ICreateBooking,
  IGetBookingList,
  IAvailableSlotsQuery,
} from '../interfaces/booking.interface';

export class BookingController {
    private readonly bookingService = bookingService;

    // ─── GET /branches/:id/available-slots ────────────────────────────────────

    getAvailableSlots = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
        const slots = await this.bookingService.getAvailableSlots(
            req.params.id,
            req.query as unknown as IAvailableSlotsQuery,
        );
        sendSuccess(res, slots, 'Available slots fetched successfully');
        } catch (err) {
        next(err);
        }
    };

    // ─── POST /bookings ────────────────────────────────────────────────────────

    create = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
        const appointment = await this.bookingService.createBooking(
            req.user.id,    // user._id from JWT (lookup customer by user_id inside service)
            req.user.id,
            req.body as ICreateBooking,
        );
        sendCreated(res, appointment, 'Booking created successfully');
        } catch (err) {
        next(err);
        }
    };

    // ─── GET /bookings ─────────────────────────────────────────────────────────

    getList = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
        const result = await this.bookingService.getBookingList(
            req.query as unknown as IGetBookingList,
            req.user.id,
            req.user.role,
        );
        sendPaginated(res, result, 'Bookings fetched successfully');
        } catch (err) {
        next(err);
        }
    };

    // ─── GET /bookings/:id ─────────────────────────────────────────────────────

    getById = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
        const data = await this.bookingService.getBookingById(
            req.params.id,
            req.user.id,
            req.user.role,
        );
        sendSuccess(res, data, 'Booking fetched successfully');
        } catch (err) {
        next(err);
        }
    };

    // ─── PATCH /bookings/:id/confirm ──────────────────────────────────────────

    confirm = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
        const appointment = await this.bookingService.confirmBooking(
            req.params.id,
            req.body as IConfirmBooking,
        );
        sendSuccess(res, appointment, 'Booking confirmed successfully');
        } catch (err) {
        next(err);
        }
    };

    // ─── POST /bookings/:id/assign-staff ──────────────────────────────────────

    assignStaff = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
        const appointment = await this.bookingService.assignStaff(
            req.params.id,
            req.body as IAssignStaff,
        );
        sendSuccess(res, appointment, 'Staff assigned successfully');
        } catch (err) {
        next(err);
        }
    };

    // ─── PATCH /bookings/:id/cancel ───────────────────────────────────────────

    cancel = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
        const appointment = await this.bookingService.cancelBooking(
            req.params.id,
            req.body as ICancelBooking,
            req.user.id,
            req.user.role,
        );
        sendSuccess(res, appointment, 'Booking cancelled successfully');
        } catch (err) {
        next(err);
        }
    };

    // ─── PATCH /bookings/:id/checkin ──────────────────────────────────────────

    checkin = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
        const appointment = await this.bookingService.checkinBooking(req.params.id);
        sendSuccess(res, appointment, 'Check-in successful');
        } catch (err) {
        next(err);
        }
    };

    // ─── PATCH /bookings/:id/start ────────────────────────────────────────────

    /**
     * Bắt đầu dịch vụ + bật máy bơm IoT.
     * IoT failure không block response — log lỗi và tiếp tục (best-effort).
     */
    startService = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
        const appointment = await this.bookingService.startService(req.params.id);

        // Best-effort: bật máy bơm. Nếu IoT fail → log, không throw.
        iotService.turnOnWaterPump().catch((err: unknown) => {
            console.error('[IoT] Failed to turn on water pump:', err);
        });

        sendSuccess(res, appointment, 'Service started successfully');
        } catch (err) {
        next(err);
        }
    };

    // ─── PATCH /bookings/:id/complete ─────────────────────────────────────────

    complete = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
        const appointment = await this.bookingService.completeBooking(req.params.id);
        sendSuccess(res, appointment, 'Booking completed successfully');
        } catch (err) {
        next(err);
        }
    };
}

export const bookingController = new BookingController();