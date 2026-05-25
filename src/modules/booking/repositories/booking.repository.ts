import { PaginateOptions, PaginateResult } from 'mongoose';
import { WashBooking, IWashBooking } from '../../../models/washBooking.model';
import { BaseRepository } from '../../../common/repositories/base.repository';

export class BookingRepository extends BaseRepository<IWashBooking> {
    constructor() {
        super(WashBooking);
    }

    /**
     * Tìm lịch hẹn theo xe + ngày + trạng thái (dùng cho check-in qua biển số)
     */
    findConfirmedBookingForToday(vehicleId: string): Promise<IWashBooking | null> {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        return this.model
            .findOne({
                vehicle_id: vehicleId,
                booking_status: 'confirmed',
                scheduled_at: { $gte: today, $lt: tomorrow },
            })
            .populate(['vehicle_id', 'service_package_id', 'customer_id'])
            .exec();
    }

    /**
     * Lấy lịch hẹn kèm populate đầy đủ thông tin liên quan
     */
    findByIdWithDetails(bookingId: string): Promise<IWashBooking | null> {
        return this.model
            .findById(bookingId)
            .populate([
                { path: 'vehicle_id' },
                { path: 'service_package_id' },
                { path: 'customer_id', select: 'full_name phone_number' },
            ])
            .exec();
    }

    /**
     * Phân trang danh sách lịch hẹn kèm populate xe và gói dịch vụ
     */
    paginateWithDetails(
        filter: Record<string, unknown>,
        options: PaginateOptions,
    ): Promise<PaginateResult<IWashBooking>> {
        return this.paginate(filter, {
            ...options,
            populate: [
                { path: 'vehicle_id', select: 'plate_number model' },
                { path: 'service_package_id', select: 'package_name' },
            ],
            sort: { scheduled_at: -1 },
        });
    }
}

export const bookingRepository = new BookingRepository(); // Singleton instance