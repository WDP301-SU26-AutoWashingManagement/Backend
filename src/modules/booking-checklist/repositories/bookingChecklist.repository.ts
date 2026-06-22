import { BookingChecklist, IBookingChecklist } from '../../../models/bookingChecklist.model';
import { BaseRepository } from '../../../common/repositories/base.repository';

class BookingChecklistRepository extends BaseRepository<IBookingChecklist> {
  constructor() {
    super(BookingChecklist);
  }

  /** Lấy checklist theo appointment_id kèm populate appointment */
  findByAppointmentId(appointmentId: string) {
    return BookingChecklist
      .findOne({ appointment_id: appointmentId })
      .populate({
        path    : 'appointment_id',
        populate: [
          {
            path    : 'customer_id',
            populate: { path: 'user_id', select: 'full_name phone email' },
          },
          { path: 'vehicle_id', select: 'license_plate vehicle_model color' },
          { path: 'branch_id',  select: 'branch_address branch_phone' },
        ],
      })
      .exec();
  }

  /** Lấy checklist theo _id kèm populate appointment đầy đủ */
  findByIdWithPopulate(id: string) {
    return BookingChecklist
      .findById(id)
      .populate({
        path    : 'appointment_id',
        populate: [
          {
            path    : 'customer_id',
            populate: { path: 'user_id', select: 'full_name phone email' },
          },
          { path: 'vehicle_id', select: 'license_plate vehicle_model color' },
          { path: 'branch_id',  select: 'branch_address branch_phone' },
        ],
      })
      .exec();
  }
}

export const bookingChecklistRepository = new BookingChecklistRepository();
