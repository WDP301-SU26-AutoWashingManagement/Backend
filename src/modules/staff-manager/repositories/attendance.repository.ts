import { BaseRepository } from '../../../common/repositories/base.repository';
import { Attendance, IAttendance, AttendanceStatus } from '../../../models/attendance.model';
import { Types } from 'mongoose';

export class AttendanceRepository extends BaseRepository<IAttendance> {
  constructor() {
    super(Attendance);
  }

  // ─── READ (replica) ────────────────────────────────────────────────────────

  findByScheduleAndStaff(scheduleId: string | Types.ObjectId, staffId: string | Types.ObjectId) {
    return this.rm.findOne({ schedule_id: scheduleId, staff_id: staffId });
  }

  findByStaff(staffId: string | Types.ObjectId) {
    return this.rm
      .find({ staff_id: staffId })
      .populate({
        path: 'schedule_id',
        select: 'shift_date start_time end_time branch_id shift_status',
      })
      .sort({ createdAt: -1 });
  }

  findByBranch(branchId: string | Types.ObjectId) {
    return this.rm
      .find({ branch_id: branchId })
      .populate({
        path: 'staff_id',
        populate: { path: 'user_id', select: 'full_name email' },
      })
      .populate({
        path: 'schedule_id',
        select: 'shift_date start_time end_time shift_status',
      })
      .sort({ createdAt: -1 });
  }

  findBySchedule(scheduleId: string | Types.ObjectId) {
    return this.rm
      .find({ schedule_id: scheduleId })
      .populate({
        path: 'staff_id',
        populate: { path: 'user_id', select: 'full_name email' },
      });
  }

  findPendingWithSchedule() {
    return this.rm
      .find({ status: AttendanceStatus.NOT_CHECKED })
      .populate({
        path: 'schedule_id',
        select: 'shift_date start_time end_time shift_status',
      });
  }

  // ─── WRITE (primary) ───────────────────────────────────────────────────────

  createPlaceholder(data: {
    schedule_id: string | Types.ObjectId;
    staff_id: string | Types.ObjectId;
    branch_id: string | Types.ObjectId;
  }) {
    // upsert để tránh lỗi duplicate key nếu record đã tồn tại (vd staff được add lại)
    return this.wm.findOneAndUpdate(
      { schedule_id: data.schedule_id, staff_id: data.staff_id },
      {
        $setOnInsert: {
          schedule_id: data.schedule_id,
          staff_id: data.staff_id,
          branch_id: data.branch_id,
          status: AttendanceStatus.NOT_CHECKED,
        },
      },
      { new: true, upsert: true },
    );
  }

  checkIn(id: string, time: Date) {
    return this.wm.findByIdAndUpdate(
      id,
      { check_in_time: time, status: AttendanceStatus.CHECKED_IN },
      { new: true },
    );
  }

  checkOut(id: string, time: Date) {
    return this.wm.findByIdAndUpdate(
      id,
      { check_out_time: time, status: AttendanceStatus.CHECKED_OUT },
      { new: true },
    );
  }

  markAbsent(id: string) {
    return this.wm.findByIdAndUpdate(
      id,
      { status: AttendanceStatus.ABSENT },
      { new: true },
    );
  }

    async removeByScheduleAndStaff(scheduleId: string | Types.ObjectId, staffId: string | Types.ObjectId): Promise<void> {
        await this.wm.deleteOne({
            schedule_id: scheduleId,
            staff_id: staffId,
        });
    }
}

export const attendanceRepository = new AttendanceRepository();