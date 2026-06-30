import { BaseRepository } from '../../../common/repositories/base.repository';
import { ISchedule, Schedule } from '../../../models/schedule.model';
import { Types } from 'mongoose';

export class ScheduleRepository extends BaseRepository<ISchedule> {
  constructor() {
    super(Schedule);
  }

  // ─── READ (replica) ────────────────────────────────────────────────────────

  findAll() {
    return this.rm.find().populate({
      path: 'assigned_staff',
      populate: { path: 'user_id', select: 'full_name email' },
    }).sort({ createdAt: -1 });
  }

  findByBranch(branchId: string) {
    return this.rm.find({ branch_id: branchId });
  }

  findByDate(date: Date) {
    return this.rm.find({ shift_date: date });
  }

  findByDateRange(from: Date, to: Date) {
    return this.rm.find({ shift_date: { $gte: from, $lte: to } });
  }

  findByStaff(staffId: string | Types.ObjectId) {
    return this.rm.find({ assigned_staff: staffId });
  }

  findAvailableShifts(date: Date) {
    return this.rm.find({
      shift_date: date,
      $expr: { $lt: [{ $size: '$assigned_staff' }, '$max_staff'] },
    });
  }

  findUnderstaffedShifts() {
    return this.rm.find({
      $expr: { $lt: [{ $size: '$assigned_staff' }, '$max_staff'] },
    });
  }

  isStaffAvailable(staffId: string | Types.ObjectId, date: Date, start: Date, end: Date) {
    return this.rm.findOne({
      assigned_staff: staffId,
      shift_date: date,
      $or: [
        { start_time: { $lt: end, $gte: start } },
        { end_time: { $gt: start, $lte: end } },
      ],
    });
  }

  getStaffWorkload(date: Date) {
    return this.rm.aggregate([
      { $match: { shift_date: date } },
      { $unwind: '$assigned_staff' },
      { $group: { _id: '$assigned_staff', shifts: { $sum: 1 } } },
    ]);
  }

  // ─── WRITE (primary) ───────────────────────────────────────────────────────

  addStaff(scheduleId: string, staffId: string | Types.ObjectId) {
    return this.wm.findByIdAndUpdate(
      scheduleId,
      { $addToSet: { assigned_staff: staffId } },
      { new: true },
    );
  }

  removeStaff(scheduleId: string, staffId: string | Types.ObjectId) {
    return this.wm.findByIdAndUpdate(
      scheduleId,
      { $pull: { assigned_staff: staffId } },
      { new: true },
    );
  }

  removeStaffFromDateRange(staffId: string | Types.ObjectId, from: Date, to: Date) {
    return this.wm.updateMany(
      { shift_date: { $gte: from, $lte: to } },
      { $pull: { assigned_staff: staffId } },
    );
  }

  updateStatus(scheduleId: string, status: string) {
    return this.wm.findByIdAndUpdate(scheduleId, { shift_status: status }, { new: true });
  }

  lockShift(scheduleId: string) {
    return this.wm.findByIdAndUpdate(scheduleId, { shift_status: 'locked' }, { new: true });
  }
}

export const scheduleRepository = new ScheduleRepository();