import { Types } from 'mongoose';
import { BaseRepository } from '../../../common/repositories/base.repository';
import { AppointmentService, IAppointmentService } from '../../../models/appointmentService.model';

export class AppointmentServiceRepository extends BaseRepository<IAppointmentService> {
  constructor() {
    super(AppointmentService);
  }

  // ─── READ (replica) ────────────────────────────────────────────────────────

  findByAppointmentId(appointmentId: string): Promise<IAppointmentService[]> {
    return this.rm
      .find({ appointment_id: new Types.ObjectId(appointmentId) })
      .populate('service_id',         'service_name service_code duration_minutes service_price service_group_id')
      .populate('service_package_id', 'package_name package_code package_discount_percentage')
      .exec();
  }

  findByAppointmentIds(appointmentIds: any[]): Promise<any[]> {
    return this.rm
      .find({ appointment_id: { $in: appointmentIds } })
      .populate('service_id',         'service_name service_code duration_minutes service_price service_group_id')
      .populate('service_package_id', 'package_name package_code package_discount_percentage')
      .lean()
      .exec();
  }

  async getTotalDuration(appointmentId: string): Promise<number> {
    const result = await this.rm.aggregate<{ total: number }>([
      { $match: { appointment_id: new Types.ObjectId(appointmentId) } },
      { $group: { _id: null, total: { $sum: '$duration_snapshot' } } },
    ]);
    return result[0]?.total ?? 0;
  }

  async getSubtotal(appointmentId: string): Promise<number> {
    const result = await this.rm.aggregate<{ subtotal: number }>([
      { $match: { appointment_id: new Types.ObjectId(appointmentId) } },
      { $group: { _id: null, subtotal: { $sum: '$price_snapshot' } } },
    ]);
    return result[0]?.subtotal ?? 0;
  }

  // ─── WRITE (primary) ───────────────────────────────────────────────────────

  deleteByAppointmentId(appointmentId: string) {
    // deleteMany kế thừa từ BaseRepository → đã dùng wm
    return this.deleteMany({ appointment_id: new Types.ObjectId(appointmentId) });
  }
}

export const appointmentServiceRepository = new AppointmentServiceRepository();