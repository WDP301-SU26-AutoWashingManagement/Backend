import { Types } from 'mongoose';
import { Vehicle } from '../../../models/vehicle.model';
import { Customer } from '../../../models/customer.model';
import { Service } from '../../../models/service.model';
import { ServicePackage } from '../../../models/servicePackage.model';
import { PackageService } from '../../../models/packageService.model';
import { Promotion } from '../../../models/promotion.model';
import { Appointment, BookingStatus } from '../../../models/appointment.model';
import { AppointmentService } from '../../../models/appointmentService.model';

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
