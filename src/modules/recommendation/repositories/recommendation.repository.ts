import { Types } from 'mongoose';
import { CacheAside } from '../../redis/decorators/cache-aside.decorator';
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
const SLOTWINDOW = 7
export interface IHistoryEntry {
  scheduled_at : Date;
  branch_id    : string | null;
  services     : string[]; // service_name[]
}

/** Package active kèm danh sách service_id thành viên (chỉ service active). */
export interface IPackageWithServices {
  package_id                  : string;
  package_name                 : string;
  package_discount_percentage  : number;
  service_ids                  : string[];
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

  /**
   * Active packages kèm danh sách service_id thành viên (chỉ tính service ACTIVE).
   * Dùng để đề xuất combo: nếu recommended_items có >=2 service cùng nằm trong 1 package → gợi ý package đó.
   */
  async findActivePackagesWithServices(): Promise<IPackageWithServices[]> {
    const packages = await ServicePackage.find({ is_active: true })
      .select('package_name package_discount_percentage')
      .lean();
    if (!packages.length) return [];

    const packageIds = packages.map((p) => p._id as Types.ObjectId);
    const links = await PackageService.find({ service_package_id: { $in: packageIds } })
      .populate('service_id', 'is_active')
      .lean();

    const membersMap = new Map<string, string[]>();
    for (const link of links) {
      const svc = link.service_id as any;
      if (!svc || !svc.is_active) continue; // chỉ tính service còn active trong combo
      const pkgId = link.service_package_id.toString();
      const list  = membersMap.get(pkgId) ?? [];
      list.push(svc._id.toString());
      membersMap.set(pkgId, list);
    }

    return packages.map((p) => ({
      package_id                 : (p._id as Types.ObjectId).toString(),
      package_name                : p.package_name,
      package_discount_percentage : p.package_discount_percentage,
      service_ids                 : membersMap.get((p._id as Types.ObjectId).toString()) ?? [],
    }));
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
    windowStart.setDate(windowStart.getDate() - SLOTWINDOW); // 00:00 của 7 ngày trước

    // Aggregation: group theo "HH:mm" của scheduled_at, đếm số booking
    const pipeline = [
      {
        $match: {
          branch_id     : new Types.ObjectId(branchId),
          booking_status: { $ne: [BookingStatus.CANCELLED, BookingStatus.PENDING] },
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

  /**
   * Đếm số lần mỗi service được dùng (xuất hiện trong AppointmentService của appointment
   * KHÔNG bị hủy). Dùng để xếp hạng "service ít được dùng nhất" — đẩy dịch vụ đang thừa
   * công suất lên gợi ý nhằm cân bằng tải và tăng doanh thu, thay vì luôn gợi ý dịch vụ vốn đã hot.
   */
  async findServiceUsageCounts(): Promise<Map<string, number>> {
    const pipeline = [
      {
        $lookup: {
          from         : Appointment.collection.name,
          localField   : 'appointment_id',
          foreignField : '_id',
          as           : 'appointment',
        },
      },
      { $unwind: '$appointment' },
      { $match: { 'appointment.booking_status': { $ne: BookingStatus.CANCELLED } } },
      { $group: { _id: '$service_id', count: { $sum: 1 } } },
    ] as any[];

    const results = await AppointmentService.aggregate(pipeline);
    const map = new Map<string, number>();
    for (const r of results) {
      map.set((r._id as Types.ObjectId).toString(), r.count as number);
    }
    return map;
  }

  /** N appointment gần nhất ĐÃ HOÀN THÀNH của 1 xe, kèm tên các service đã dùng. */
  @CacheAside({
    keyPrefix: 'vehicle:history',
    ttl: 600,
    hydrate: false
  })
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