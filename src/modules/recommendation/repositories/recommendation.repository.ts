import { Types } from 'mongoose';
import { Vehicle } from '../../../models/vehicle.model';
import { Customer } from '../../../models/customer.model';
import { Service } from '../../../models/service.model';
import { ServicePackage } from '../../../models/servicePackage.model';
import { PackageService } from '../../../models/packageService.model';
import { Promotion } from '../../../models/promotion.model';
import { Appointment, BookingStatus } from '../../../models/appointment.model';
import { AppointmentService } from '../../../models/appointmentService.model';
import { Schedule } from '../../../models/schedule.model';
import { StaffAbsentRequest } from '../../../models/staffAbsentRequest.model';
import { Staff } from '../../../models/staff.model';
import { RequestStatus } from '../../../common/types/enum';

/** Map từ slot time string ("HH:mm") → số booking lịch sử */
export type SlotCongestionMap = Map<string, number>;

export interface IHistoryEntry {
  scheduled_at : Date;
  branch_id    : string | null;
  services     : string[]; // service_name[]
}

export class RecommendationRepository {
  findVehicleWithClass(vehicleId: string) {
    return Vehicle.findById(vehicleId)
      .populate('vehicle_class_id', 'class_name description')
      .lean();
  }

  findCustomerWithTier(userId: string) {
    return Customer.findOne({ user_id: new Types.ObjectId(userId) })
      .populate('tier_id')
      .lean();
  }

  /** Active services kèm embedding (field bị select:false mặc định nên phải xin rõ). */
  findActiveServices() {
    return Service.find({ is_active: true })
      .select('service_name description service_price duration_minutes service_group_id +embedding')
      .lean();
  }

  /** Active packages kèm embedding. */
  findActivePackages() {
    return ServicePackage.find({ is_active: true })
      .select('package_name description package_discount_percentage service_group_id +embedding')
      .lean();
  }

  /** Các service con của 1 package (để tính giá/duration tổng của package). */
  findServicesInPackage(packageId: string) {
    return PackageService.find({ service_package_id: new Types.ObjectId(packageId) })
      .populate('service_id', 'service_name service_price duration_minutes is_active')
      .lean();
  }

  findActivePromotions() {
    const now = new Date();
    return Promotion.find({
      is_active : true,
      start_date: { $lte: now },
      end_date  : { $gte: now },
    })
      .select('promotion_name description code type discount_percentage discount_amount min_order_amount service_ids')
      .lean();
  }

  /**
   * Lấy congestion map cho 1 branch trong 7 ngày trước bookingDate.
   * Dùng Aggregation Pipeline để nhóm booking theo slot time ("HH:mm").
   * Không tính booking CANCELLED.
   */
  async findSlotCongestionMap(
    branchId   : string,
    bookingDate: Date,   // ngày khách muốn đặt (dùng để tính window 7 ngày trước)
  ): Promise<SlotCongestionMap> {
    const windowEnd   = new Date(bookingDate);
    windowEnd.setHours(0, 0, 0, 0); // 00:00 của ngày đặt

    const windowStart = new Date(windowEnd);
    windowStart.setDate(windowStart.getDate() - 7); // 00:00 của 7 ngày trước

    // Aggregation: group theo "HH:mm" của scheduled_at, đếm số booking
    const pipeline = [
      {
        $match: {
          branch_id     : new Types.ObjectId(branchId),
          booking_status: { $ne: BookingStatus.CANCELLED },
          scheduled_at  : { $gte: windowStart, $lt: windowEnd },
        },
      },
      {
        $group: {
          _id  : {
            $dateToString: {
              format  : '%H:%M',
              date    : '$scheduled_at',
              timezone: '+07:00', // UTC+7 (Vietnam)
            },
          },
          count: { $sum: 1 },
        },
      },
    ] as any[];

    const results = await Appointment.aggregate(pipeline);
    const map     = new Map<string, number>();
    for (const r of results) {
      map.set(r._id as string, r.count as number);
    }
    return map;
  }

  /**
   * Kiểm tra xem branch có ít nhất 1 nhân viên hợp lệ vào thời điểm slotDate không.
   * Điều kiện:
   *  - Nhân viên thuộc branch.
   *  - Có ca làm việc (Schedule) bao phủ thời điểm slot.
   *  - Không nghỉ phép (StaffAbsentRequest APPROVED) vào ngày đó.
   *  - Có thể thực hiện ít nhất 1 trong các service yêu cầu
   *    (hiện tại Staff model chưa có service_ids — bỏ qua điều kiện này,
   *     chỉ check branch + schedule + absence).
   */
  async hasAvailableStaffForSlot(
    branchId   : string,
    slotDate   : Date,       // ISO Date của slot cụ thể
    serviceIds : string[],   // reserved cho tương lai khi Staff có service_ids
  ): Promise<boolean> {
    // 1. Lấy danh sách staff thuộc branch
    const staffList = await Staff.find({ branch_id: new Types.ObjectId(branchId) })
      .select('_id')
      .lean();
    if (!staffList.length) return false;

    const staffIds = staffList.map((s) => s._id as Types.ObjectId);

    // 2. Tìm staff có ca làm việc (Schedule) bao phủ giờ của slot
    const slotHHMM    = slotDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Ho_Chi_Minh' });
    const dayStart    = new Date(slotDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd      = new Date(slotDate);
    dayEnd.setHours(23, 59, 59, 999);

    // Schedule bao phủ: start_time <= slotHHMM < end_time
    const coveringSchedules = await Schedule.find({
      branch_id     : new Types.ObjectId(branchId),
      shift_date    : { $gte: dayStart, $lte: dayEnd },
      start_time    : { $lte: slotHHMM },
      end_time      : { $gt : slotHHMM },
      assigned_staff: { $in: staffIds },
    })
      .select('assigned_staff')
      .lean();

    if (!coveringSchedules.length) return false;

    // Staff có trong ít nhất 1 schedule hợp lệ
    const scheduledStaffIds = new Set<string>();
    for (const sch of coveringSchedules) {
      for (const sid of (sch.assigned_staff as Types.ObjectId[])) {
        scheduledStaffIds.add(sid.toString());
      }
    }
    if (!scheduledStaffIds.size) return false;

    // 3. Loại bỏ staff đang nghỉ phép (APPROVED) trong ngày slot
    const absentStaff = await StaffAbsentRequest.find({
      staff_id      : { $in: [...scheduledStaffIds].map((id) => new Types.ObjectId(id)) },
      request_status: RequestStatus.APPROVED,
      from_date     : { $lte: dayEnd   },
      to_date       : { $gte: dayStart },
    })
      .select('staff_id')
      .lean();

    const absentIds = new Set(absentStaff.map((a) => (a.staff_id as Types.ObjectId).toString()));

    // Nếu có ít nhất 1 staff scheduled mà không nghỉ phép → slot hợp lệ
    for (const sid of scheduledStaffIds) {
      if (!absentIds.has(sid)) return true;
    }

    return false;
  }

  /** N appointment gần nhất ĐÃ HOÀN THÀNH của 1 xe, kèm tên các service đã dùng. */
  async findRecentHistory(vehicleId: string, limit = 5): Promise<IHistoryEntry[]> {
    const appointments = await Appointment.find({
      vehicle_id    : new Types.ObjectId(vehicleId),
      booking_status: BookingStatus.COMPLETED,
    })
      .sort({ scheduled_at: -1 })
      .limit(limit)
      .lean();

    if (!appointments.length) return [];

    const appointmentIds = appointments.map((a) => a._id);
    const items = await AppointmentService.find({ appointment_id: { $in: appointmentIds } })
      .populate('service_id', 'service_name')
      .lean();

    return appointments.map((a) => ({
      scheduled_at: a.scheduled_at,
      branch_id   : a.branch_id ? a.branch_id.toString() : null,
      services    : items
        .filter((i) => i.appointment_id.toString() === a._id.toString())
        .map((i) => (i.service_id as any)?.service_name)
        .filter(Boolean),
    }));
  }
}

export const recommendationRepository = new RecommendationRepository();