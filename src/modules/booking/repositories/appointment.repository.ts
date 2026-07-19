import { FilterQuery, PaginateOptions, PaginateResult, Types } from 'mongoose';
import { BaseRepository } from '../../../common/repositories/base.repository';
import { Appointment, BookingStatus, IAppointment } from '../../../models/appointment.model';

export class AppointmentRepository extends BaseRepository<IAppointment> {
  constructor() {
    super(Appointment);
  }

  // ─── READ (replica) ────────────────────────────────────────────────────────

  countActiveInWindow(branchId: string, windowStart: Date, windowEnd: Date): Promise<number> {
    return this.rm.countDocuments({
      branch_id: new Types.ObjectId(branchId),
      booking_status: {
        $in: [BookingStatus.PENDING, BookingStatus.CONFIRMED, BookingStatus.CHECKED_IN, BookingStatus.IN_PROGRESS],
      },
      scheduled_at: { $gte: windowStart, $lt: windowEnd },
    }).exec();
  }

  findActiveByBranchAndDate(branchId: string, dayStart: Date, dayEnd: Date): Promise<IAppointment[]> {
    return this.rm.find({
      branch_id: new Types.ObjectId(branchId),
      booking_status: {
        $in: [BookingStatus.PENDING, BookingStatus.CONFIRMED, BookingStatus.CHECKED_IN, BookingStatus.IN_PROGRESS],
      },
      scheduled_at: { $gte: dayStart, $lt: dayEnd },
    }).exec();
  }

  findByIdAndCustomer(appointmentId: string, customerId: string): Promise<IAppointment | null> {
    return this.rm.findOne({
      _id: new Types.ObjectId(appointmentId),
      customer_id: new Types.ObjectId(customerId),
    }).exec();
  }

  hasOverlappingBooking(vehicleId: string, scheduledAt: Date): Promise<boolean> {
    // exists() trong BaseRepository đã dùng rm
    return this.exists({
      vehicle_id: new Types.ObjectId(vehicleId),
      booking_status: { $nin: [BookingStatus.COMPLETED, BookingStatus.CANCELLED] },
      scheduled_at: scheduledAt,
    });
  }

  paginateList(
    filter: FilterQuery<IAppointment>,
    options: PaginateOptions,
  ): Promise<PaginateResult<IAppointment>> {
    // paginate() trong BaseRepository đã dùng rm
    return this.paginate(filter, {
      ...options,
      sort: { scheduled_at: -1 },
      populate: [
        { path: 'branch_id', select: 'branch_address operating_time bay_counts' },
        { path: 'vehicle_id', select: 'license_plate vehicle_model color fuel_type vehicle_class_id model_id' },
        {
          path: 'customer_id', populate: [
            { path: 'user_id', select: 'full_name email phone avatar_url' },
            { path: 'tier_id', select: 'tier_name discount_percentage' },
          ]
        },
      ],
    });
  }

  findByIdPopulated(id: string) {
    // Đây là deep-populated read → dùng rm
    return this.rm.findById(id)
      .populate('branch_id', 'branch_address operating_time bay_counts web_url branch_phone')
      .populate('vehicle_id', 'license_plate vehicle_model color fuel_type vehicle_class_id model_id')
      .populate({
        path: 'customer_id',
        populate: [
          { path: 'user_id', select: 'full_name email phone avatar_url' },
          { path: 'tier_id', select: 'tier_name discount_percentage' },
        ],
      })
  }

  findWashingBookings(branchId: string, fromDate?: string, toDate?: string): Promise<IAppointment[]> {
    const filter: FilterQuery<IAppointment> = {
      branch_id: new Types.ObjectId(branchId),
      booking_status: BookingStatus.IN_PROGRESS,
    };

    if (fromDate || toDate) {
      filter.scheduled_at = {};
      if (fromDate) filter.scheduled_at.$gte = new Date(fromDate);
      if (toDate) filter.scheduled_at.$lte = new Date(toDate);
    }

    return this.rm.find(filter)
      .populate('vehicle_id', 'license_plate vehicle_model color fuel_type vehicle_class_id model_id')
      .populate({
        path: 'customer_id',
        populate: { path: 'user_id', select: 'full_name phone' }
      })
      .exec();
  }
}

export const appointmentRepository = new AppointmentRepository();