import { BaseRepository } from '../../../common/repositories/base.repository';
import { ISchedule, Schedule } from '../../../models/schedule.model';
import { Types } from 'mongoose';

export class ScheduleRepository extends BaseRepository<ISchedule> {
    constructor() {
        super(Schedule);
    }

    // ===================== QUERY =====================
    findAll() {
        return this.model.find().sort({ createdAt: -1 });
    }

    findByBranch(branchId: string) {
        return this.model.find({ branch_id: branchId });
    }

    findByDate(date: Date) {
        return this.model.find({ shift_date: date });
    }

    findByDateRange(from: Date, to: Date) {
        return this.model.find({
            shift_date: { $gte: from, $lte: to }
        });
    }

    findByStaff(staffId: string | Types.ObjectId) {
        return this.model.find({
            assigned_staff: staffId
        });
    }

    findAvailableShifts(date: Date) {
        return this.model.find({
            shift_date: date,
            $expr: {
                $lt: [{ $size: "$assigned_staff" }, "$max_staff"]
            }
        });
    }

    findUnderstaffedShifts() {
        return this.model.find({
            $expr: {
                $lt: [{ $size: "$assigned_staff" }, "$max_staff"]
            }
        });
    }

    // ===================== STAFF ASSIGNMENT =====================

    addStaff(scheduleId: string, staffId: string | Types.ObjectId) {
        return this.model.findByIdAndUpdate(
            scheduleId,
            { $addToSet: { assigned_staff: staffId } },
            { new: true }
        );
    }

    removeStaff(scheduleId: string, staffId: string | Types.ObjectId) {
        return this.model.findByIdAndUpdate(
            scheduleId,
            { $pull: { assigned_staff: staffId } },
            { new: true }
        );
    }

    isStaffAvailable(
        staffId: string | Types.ObjectId,
        date: Date,
        start: Date,
        end: Date
    ) {
        return this.model.findOne({
            assigned_staff: staffId,
            shift_date: date,
            $or: [
                { start_time: { $lt: end, $gte: start } },
                { end_time: { $gt: start, $lte: end } }
            ]
        });
    }

    // ===================== STATUS =====================

    updateStatus(scheduleId: string, status: string) {
        return this.model.findByIdAndUpdate(
            scheduleId,
            { shift_status: status },
            { new: true }
        );
    }

    lockShift(scheduleId: string) {
        return this.model.findByIdAndUpdate(
            scheduleId,
            { shift_status: "locked" },
            { new: true }
        );
    }

    // ===================== ANALYTICS =====================

    getStaffWorkload(date: Date) {
        return this.model.aggregate([
            { $match: { shift_date: date } },
            { $unwind: "$assigned_staff" },
            {
                $group: {
                    _id: "$assigned_staff",
                    shifts: { $sum: 1 }
                }
            }
        ]);
    }

}

export const scheduleRepository = new ScheduleRepository();