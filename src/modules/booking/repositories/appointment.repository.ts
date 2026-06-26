import { FilterQuery, PaginateOptions, PaginateResult, Types } from 'mongoose';
import { BaseRepository } from '../../../common/repositories/base.repository';
import { Appointment, BookingStatus, IAppointment } from '../../../models/appointment.model';

export class AppointmentRepository extends BaseRepository<IAppointment> {
    constructor() {
        super(Appointment);
    }

    // ─── Slot / Availability ──────────────────────────────────────────────────

    /**
     * Đếm số booking đang "chiếm bay" tại branch trong khoảng thời gian
     * [windowStart, windowEnd). Dùng để kiểm tra bay_counts còn trống.
     * Chỉ các booking chưa kết thúc (PENDING, CONFIRMED, CHECKED_IN) mới
     * chiếm bay — COMPLETED, CANCELLED không tính.
     */
    countActiveInWindow(
        branchId: string,
        windowStart: Date,
        windowEnd: Date,
    ): Promise<number> {
        return this.model.countDocuments({
        branch_id     : new Types.ObjectId(branchId),
        booking_status: {
            $in: [BookingStatus.PENDING, BookingStatus.CONFIRMED, BookingStatus.CHECKED_IN, BookingStatus.IN_PROGRESS],
        },
        scheduled_at: { $gte: windowStart, $lt: windowEnd },
        }).exec();
    }

    /**
     * Lấy tất cả booking active trong 1 ngày của 1 branch.
     * Dùng để build danh sách available slots.
     */
    findActiveByBranchAndDate(
        branchId: string,
        dayStart : Date,
        dayEnd   : Date,
    ): Promise<IAppointment[]> {
        return this.model.find({
        branch_id     : new Types.ObjectId(branchId),
        booking_status: {
            $in: [BookingStatus.PENDING, BookingStatus.CONFIRMED, BookingStatus.CHECKED_IN, BookingStatus.IN_PROGRESS],
        },
        scheduled_at: { $gte: dayStart, $lt: dayEnd },
        }).exec();
    }

    // ─── Ownership Checks ─────────────────────────────────────────────────────

    /**
     * Tìm appointment theo id và customer_id cùng lúc.
     * Dùng để verify customer chỉ thao tác booking của chính mình.
     */
    findByIdAndCustomer(
        appointmentId: string,
        customerId   : string,
    ): Promise<IAppointment | null> {
        return this.model.findOne({
        _id        : new Types.ObjectId(appointmentId),
        customer_id: new Types.ObjectId(customerId),
        }).exec();
    }

    /**
     * Kiểm tra customer đã có booking pending/confirmed trong cùng time slot chưa.
     * Business rule: không cho đặt trùng slot.
     */
    hasOverlappingBooking(
        vehicleId  : string,
        scheduledAt : Date,
    ): Promise<boolean> {
        return this.exists({
        vehicle_id    : new Types.ObjectId(vehicleId),
        booking_status: { $in: [BookingStatus.PENDING, BookingStatus.CONFIRMED] },
        scheduled_at  : scheduledAt,
        });
    }

    // ─── Paginate ─────────────────────────────────────────────────────────────

    paginateList(
        filter  : FilterQuery<IAppointment>,
        options : PaginateOptions,
    ): Promise<PaginateResult<IAppointment>> {
        return this.paginate(filter, {
        ...options,
        sort    : { scheduled_at: -1 },
        populate: [
            { path: 'branch_id',   select: 'branch_address operating_time bay_counts' },
            { path: 'vehicle_id',  select: 'license_plate vehicle_model color fuel_type vehicle_class_id model_id' },
            { path: 'customer_id', populate: [
                { path: 'user_id', select: 'full_name email phone avatar_url' },
                { path: 'tier_id', select: 'tier_name discount_percentage' }
            ] },
            { path: 'staff_id',    populate: { path: 'user_id', select: 'full_name email phone' }, options: { strictPopulate: false } },
        ],
        });
    }

    /**
     * Lấy đầy đủ chi tiết 1 appointment (populate sâu).
     */
    findByIdPopulated(id: string): ReturnType<typeof Appointment.findById> {
        return Appointment.findById(id)
        .populate('branch_id',   'branch_address operating_time bay_counts web_url branch_phone')
        .populate('vehicle_id',  'license_plate vehicle_model color fuel_type vehicle_class_id model_id')
        .populate({
            path    : 'customer_id',
            populate: [
                { path: 'user_id', select: 'full_name email phone avatar_url' },
                { path: 'tier_id', select: 'tier_name discount_percentage' }
            ],
        })
        .populate({
            path    : 'staff_id',
            populate: { path: 'user_id', select: 'full_name email phone' },
            options : { strictPopulate: false },
        })
    }
}

export const appointmentRepository = new AppointmentRepository();