import { AppError } from '@common/utils/AppError';
import { WashBooking } from '../../../models/washBooking.model';
import { Types } from 'mongoose';
import { BUSINESS_HOURS, OPEN_DAYS, MIN_ADVANCE_MINUTES, SLOT_DURATION_MINUTES } from '@common/constants';

/**
 * Kiểm tra toàn bộ điều kiện nghiệp vụ liên quan đến thời gian đặt lịch.
 * Ném AppError ngay khi gặp vi phạm đầu tiên.
 */
export async function validateScheduledAt(
    scheduledAt: Date,
    vehicleId: string | Types.ObjectId,
    maxWindowDays: number
): Promise<void> {
    const now = new Date();

    // 1. Không được đặt trong quá khứ
    if (scheduledAt <= now) {
        throw new AppError('Thời gian đặt lịch phải là thời điểm trong tương lai', 400);
    }

    // 2. Phải đặt trước ít nhất MIN_ADVANCE_MINUTES
    const diffMinutes = (scheduledAt.getTime() - now.getTime()) / 60_000;
    if (diffMinutes < MIN_ADVANCE_MINUTES) {
        throw new AppError(
            `Vui lòng đặt lịch trước ít nhất ${MIN_ADVANCE_MINUTES} phút`,
            400,
        );
    }

    // 3. Chỉ nhận lịch trong ngày hoạt động
    const dayOfWeek = scheduledAt.getDay();
    if (!OPEN_DAYS.includes(dayOfWeek)) {
        throw new AppError('Ngày hôm nay chúng tôi không hoạt động', 400);
    }

    const maxAdvanceMinutes = maxWindowDays * 24 * 60;
    if (diffMinutes > maxAdvanceMinutes) {
        throw new AppError(
            `Bạn chỉ có thể đặt lịch trước tối đa ${maxWindowDays} ngày`,
            400,
        );
    }

    // 4. Chỉ nhận lịch trong giờ hoạt động
    const hour = scheduledAt.getHours();
    if (hour < BUSINESS_HOURS.open || hour >= BUSINESS_HOURS.close) {
        throw new AppError(
            `Giờ hoạt động từ ${BUSINESS_HOURS.open}:00 đến ${BUSINESS_HOURS.close}:00`,
            400,
        );
    }

    // 5. Xe không được có booking active (pending/confirmed) trong cùng slot ±30 phút
    const slotStart = new Date(scheduledAt.getTime() - SLOT_DURATION_MINUTES * 60_000);
    const slotEnd   = new Date(scheduledAt.getTime() + SLOT_DURATION_MINUTES * 60_000);

    const conflict = await WashBooking.exists({
        vehicle_id:     vehicleId,
        booking_status: { $in: ['pending', 'confirmed'] },
        scheduled_at:   { $gte: slotStart, $lt: slotEnd },
    });

    if (conflict) {
        throw new AppError(
            'Xe này đã có lịch hẹn trong khung giờ đó. Vui lòng chọn giờ khác',
            409,
        );
    }
}