import { Types } from 'mongoose';
import { BaseRepository } from '../../../common/repositories/base.repository';
import { AppointmentService, IAppointmentService } from '../../../models/appointmentService.model';

export class AppointmentServiceRepository extends BaseRepository<IAppointmentService> {
  constructor() {
    super(AppointmentService);
  }

  /**
   * Lấy tất cả services của 1 appointment, populate service và package.
   */
  findByAppointmentId(appointmentId: string): Promise<IAppointmentService[]> {
    return this.model
      .find({ appointment_id: new Types.ObjectId(appointmentId) })
      .populate('service_id',         'service_name service_code duration_minutes service_price service_group_id')
      .populate('service_package_id', 'package_name package_code package_discount_percentage')
      .exec();
  }

  /**
   * Lấy tất cả services của nhiều appointments, populate service và package.
   * Dùng cho list view (chống N+1 query).
   */
  findByAppointmentIds(appointmentIds: any[]): Promise<any[]> {
    return this.model
      .find({ appointment_id: { $in: appointmentIds } })
      .populate('service_id',         'service_name service_code duration_minutes service_price service_group_id')
      .populate('service_package_id', 'package_name package_code package_discount_percentage')
      .lean()
      .exec();
  }

  /**
   * Xoá tất cả service line-items của 1 appointment.
   * Dùng khi cancel appointment để clean up.
   */
  deleteByAppointmentId(appointmentId: string) {
    return this.deleteMany({ appointment_id: new Types.ObjectId(appointmentId) });
  }

  /**
   * Tính tổng duration của tất cả services trong appointment.
   * Dùng để estimate thời gian hoàn thành.
   */
  async getTotalDuration(appointmentId: string): Promise<number> {
    const result = await this.model.aggregate<{ total: number }>([
      { $match: { appointment_id: new Types.ObjectId(appointmentId) } },
      { $group: { _id: null, total: { $sum: '$duration_snapshot' } } },
    ]);
    return result[0]?.total ?? 0;
  }

  /**
   * Tính subtotal (tổng tiền) của 1 appointment từ price_snapshot.
   * Dùng khi tạo Invoice để đảm bảo con số khớp với lúc booking.
   */
  async getSubtotal(appointmentId: string): Promise<number> {
    const result = await this.model.aggregate<{ subtotal: number }>([
      { $match: { appointment_id: new Types.ObjectId(appointmentId) } },
      { $group: { _id: null, subtotal: { $sum: '$price_snapshot' } } },
    ]);
    return result[0]?.subtotal ?? 0;
  }
}

export const appointmentServiceRepository = new AppointmentServiceRepository();