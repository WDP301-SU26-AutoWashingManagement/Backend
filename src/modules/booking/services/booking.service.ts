import { BookingStatus } from '../../../models/washBooking.model';
import { ServicePackage } from '../../../models/servicePackage.model';
import { Promotion } from '../../../models/promotion.model';
import { Vehicle } from '../../../models/vehicle.model';
import { AppError } from '../../../common/utils/AppError';
import { MongoId } from '../../../common/types';
import { BookingRepository } from '../repositories/booking.repository';
import { promotionRepository, PromotionRepository } from '@modules/promotion/repositories/promotion.repository';
import { toObjectId } from '@common/utils/mongo.util';
import {
    CreateBookingDto,
    CancelBookingDto,
    GetBookingListDto,
    UpdateBookingStatusDto,
    FindByPlateNumberDto,
} from '../dtos/booking.dto';
import { validateScheduledAt } from '../middlewares/booking-window.middleware';
import { customerRepository, CustomerRepository } from '@modules/customer/repositories/customer.repository';
import { DEFAULT_BOOKING_WINDOW_DAYS } from '@common/constants';

import { bookingRepository } from '../repositories/booking.repository';
export class BookingService {
    private readonly bookingRepo: BookingRepository;
    private readonly promotionRepo: PromotionRepository;
    private readonly customerRepo: CustomerRepository;

    constructor() {
        this.bookingRepo = bookingRepository;
        this.promotionRepo = promotionRepository;
        this.customerRepo = customerRepository;
    }

    // ─────────────────────────────────────────────
    // POST /bookings
    // ─────────────────────────────────────────────
    async createBooking(customerId: MongoId, data: CreateBookingDto) {
        const vehicle = await Vehicle.findOne({
            _id: data.vehicle_id,
            customer_id: customerId,
        });

        if (!vehicle) {
            throw new AppError('Phương tiện không hợp lệ hoặc không thuộc quyền sở hữu của bạn', 403);
        }

        const bookingWindowDays =
            (await this.customerRepo.findBookingWindowByCustomerId(customerId))
            ?? DEFAULT_BOOKING_WINDOW_DAYS;
        
        // Step 3: Validate thời gian đặt lịch
        const scheduledAt = new Date(data.scheduled_at);
        await validateScheduledAt(scheduledAt, data.vehicle_id, bookingWindowDays);

        const pkg = await ServicePackage.findById(data.service_package_id);

        if (!pkg || !pkg.is_active) {
            throw new AppError('Gói dịch vụ không tồn tại hoặc đã ngừng hoạt động', 404);
        }

        const basePrice = pkg.service_price;
        let discount = 0;

        if (data.promotion_id) {
            const promotion = await Promotion.findOne({
                _id: data.promotion_id,
                is_active: true,
            });

            if (!promotion) {
                throw new AppError('Mã khuyến mãi không hợp lệ hoặc đã hết hạn', 404);
            }

            discount =
                promotion.discount_type === 'percentage'
                    ? basePrice * (promotion.discount_value / 100)
                    : promotion.discount_value;
        }

        const finalPrice = basePrice - discount;

        const booking = await this.bookingRepo.create({
            customer_id:        toObjectId(customerId),
            vehicle_id:         toObjectId(data.vehicle_id),
            service_package_id: toObjectId(data.service_package_id),
            promotion_id:       data.promotion_id ? toObjectId(data.promotion_id) : undefined,
            scheduled_at:       new Date(data.scheduled_at),
            base_price:         basePrice,
            discount_amount:    discount,
            final_price:        finalPrice,
            booking_status:     'pending',
            booking_source:     data.booking_source,
        });

        if (data.promotion_id) {
            await this.promotionRepo.updateById(data.promotion_id, {
                $inc: { used_count: 1 },
            });
        }

        return booking;
    }

    // ─────────────────────────────────────────────
    // PATCH /bookings/:id/cancel
    // ─────────────────────────────────────────────
    async cancelBooking(bookingId: string, customerId: MongoId, data: CancelBookingDto) {
        const booking = await this.bookingRepo.findOne({
            _id: bookingId,
            customer_id: customerId,
        });

        if (!booking) throw new AppError('Không tìm thấy lịch hẹn', 404);

        const allowedStatuses = ['pending', 'confirmed'];
        if (!allowedStatuses.includes(booking.booking_status)) {
            throw new AppError(
                `Không thể hủy lịch hẹn đang ở trạng thái: ${booking.booking_status}`,
                400,
            );
        }

        booking.booking_status      = 'cancelled';
        booking.cancelled_at        = new Date();
        booking.cancellation_reason = data.reason;

        return await booking.save();
    }

    // ─────────────────────────────────────────────
    // GET /bookings
    // ─────────────────────────────────────────────
    async getBookingList(dto: GetBookingListDto, role: string, requesterId: string) {
        const { page, limit, customer_id, vehicle_id, booking_status, scheduled_from, scheduled_to } = dto;

        // Customer chỉ thấy booking của chính mình
        const filters: Record<string, unknown> = role === 'admin'
            ? {}
            : { customer_id: toObjectId(requesterId) };

        // Admin có thể lọc thêm theo customer cụ thể
        if (role === 'admin' && customer_id) {
            filters.customer_id = toObjectId(customer_id);
        }

        if (vehicle_id)     filters.vehicle_id     = toObjectId(vehicle_id);
        if (booking_status) filters.booking_status = booking_status;

        if (scheduled_from || scheduled_to) {
            filters.scheduled_at = {
                ...(scheduled_from && { $gte: new Date(scheduled_from) }),
                ...(scheduled_to   && { $lte: new Date(scheduled_to) }),
            };
        }

        return await this.bookingRepo.paginateWithDetails(filters, { page, limit });
    }

    // ─────────────────────────────────────────────
    // GET /bookings/:id
    // ─────────────────────────────────────────────
    async getBookingById(bookingId: string, customerId?: string, role?: string) {
        const booking = await this.bookingRepo.findByIdWithDetails(bookingId);

        if (
            !booking ||
            (role !== 'admin' && customerId && String(booking.customer_id) !== String(customerId))
        ) {
            throw new AppError('Không tìm thấy thông tin lịch hẹn hoặc bạn không có quyền xem', 404);
        }

        return booking;
    }

    // ─────────────────────────────────────────────
    // PATCH /bookings/:id/status  (admin)
    // ─────────────────────────────────────────────
    async updateStatus(bookingId: string, dto: UpdateBookingStatusDto) {
        const booking = await this.bookingRepo.findById(bookingId);
        if (!booking) throw new AppError('Không tìm thấy lịch hẹn', 404);

        booking.booking_status = dto.status;

        switch (dto.status) {
            case 'checked_in':
                booking.checkedin_at = new Date();
                break;
            case 'completed':
                booking.completed_at = new Date();
                // TODO: await this.handleAwardPoints(booking);
                break;
            case 'cancelled':
                booking.cancelled_at = new Date();
                break;
            case 'in_progress':
                // TODO: push realtime notification
                break;
        }

        return await booking.save();
    }

    // ─────────────────────────────────────────────
    // POST /bookings/:id/confirm  (admin)
    // ─────────────────────────────────────────────
    async confirmBooking(bookingId: string) {
        const booking = await this.bookingRepo.findById(bookingId);
        if (!booking) throw new AppError('Không tìm thấy lịch hẹn', 404);

        if (booking.booking_status !== 'pending') {
            throw new AppError('Chỉ có thể xác nhận lịch hẹn đang chờ (pending)', 400);
        }

        return await this.updateStatus(bookingId, { status: 'confirmed' });
    }

    // ─────────────────────────────────────────────
    // GET /bookings/plate/:plateNumber  (staff check-in)
    // ─────────────────────────────────────────────
    async findBookingByPlateNumber(dto: FindByPlateNumberDto) {
        const vehicle = await Vehicle.findOne({
            plate_number: dto.plate_number.toUpperCase(),
        });

        if (!vehicle) throw new AppError('Không tìm thấy phương tiện này trong hệ thống', 404);

        const booking = await this.bookingRepo.findConfirmedBookingForToday(String(vehicle._id));

        if (!booking) {
            throw new AppError('Không tìm thấy lịch hẹn đã xác nhận cho xe này trong hôm nay', 404);
        }

        return booking;
    }
}

export const bookingService = new BookingService();