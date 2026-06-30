import { Appointment, BookingStatus, IAppointment } from '../../../models/appointment.model';
import { Types } from 'mongoose';
import { WashingStatus } from '../interfaces/washingStatus.interface';
import { redisClient } from '../../../configs/redis.config';

export interface BookingStatusUpdate {
  appointment_id : string;
  appointment_code : string;
  booking_status : BookingStatus;
  scheduled_at   : string;
  branch_name    : string | null;
  vehicle_plate  : string | null;
}

export class NotificationService {
  /**
   * Fetch all active bookings for a given user (by branch for staff/admin, or by customer).
   * Returns a lean summary suitable for SSE streaming.
   */
  async getActiveBookingStatuses(branchId?: string, customerId?: string): Promise<BookingStatusUpdate[]> {
    const activeStatuses = [
      BookingStatus.PENDING,
      BookingStatus.CONFIRMED,
      BookingStatus.CHECKED_IN,
      BookingStatus.IN_PROGRESS,
      BookingStatus.WASHED,
    ];

    const filter: Record<string, any> = {
      booking_status: { $in: activeStatuses },
    };

    if (branchId)   filter.branch_id   = new Types.ObjectId(branchId);
    if (customerId) filter.customer_id = new Types.ObjectId(customerId);

    const bookings = await Appointment.find(filter)
      .populate('branch_id',  'branch_name')
      .populate('vehicle_id', 'license_plate')
      .sort({ scheduled_at: 1 })
      .lean();

    return bookings.map((b: any) => ({
      appointment_id   : b._id.toString(),
      appointment_code : b.appointment_code,
      booking_status   : b.booking_status,
      scheduled_at     : b.scheduled_at?.toISOString() ?? '',
      branch_name      : b.branch_id?.branch_name ?? null,
      vehicle_plate    : b.vehicle_id?.license_plate ?? null,
    }));
  }

  async getCustomerWashingStatus(customer_id: string) {
    const activeStatuses = [
      BookingStatus.PENDING,
      BookingStatus.CONFIRMED,
      BookingStatus.CHECKED_IN,
      BookingStatus.IN_PROGRESS,
      BookingStatus.WASHED,
    ];

    const filter: Record<string, any> = {
      booking_status: { $in: activeStatuses },
    };

    if (customer_id) filter.customer_id = new Types.ObjectId(customer_id);

    const bookings = await Appointment.find(filter)
      .populate('branch_id',  'branch_name')
      .populate('vehicle_id', 'license_plate')
      .sort({ scheduled_at: 1 })
      .lean();

    return bookings.map((b: any) => ({
      appointment_id   : b._id.toString(),
      appointment_code : b.appointment_code,
      booking_status   : b.booking_status,
      scheduled_at     : b.scheduled_at?.toISOString() ?? '',
      branch_name      : b.branch_id?.branch_name ?? null,
      vehicle_plate    : b.vehicle_id?.license_plate ?? null,
    }));
  }

  async updateStatus(branch_id: string, status: WashingStatus, customer_id: string) {
    await redisClient.set(branch_id, JSON.stringify(status))
  }

  async getStatus(branch_id: string) {
    return await redisClient.get(branch_id);
  }
}

export const notificationService = new NotificationService();
