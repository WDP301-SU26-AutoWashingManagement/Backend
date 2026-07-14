import { Types } from 'mongoose';
import { attendanceRepository } from '../repositories/attendance.repository';
import { scheduleRepository } from '../repositories/schedule.repository';
import { staffRepository } from '../repositories/staff.repository';
import { NotFoundError, BadRequestError, ForbiddenError } from '../../../common/utils/AppError';
import { AttendanceStatus } from '../../../models/attendance.model';
import { ICheckInResponse, ICheckOutResponse } from '../dto/attendance.dto';

export class AttendanceService {
  private readonly attendanceRepo = attendanceRepository;
  private readonly scheduleRepo = scheduleRepository;
  private readonly staffRepo = staffRepository;

  /**
   * Check-in cho một ca làm việc
   * Người thực hiện: Staff (chính chủ)
   * Điều kiện: Staff phải nằm trong assigned_staff của ca, chưa checkin trước đó
   */
  async checkIn(userId: string, scheduleId: string): Promise<ICheckInResponse> {
    const staff = await this.staffRepo.findByUserId(userId);
    if (!staff) {
      throw new NotFoundError('Không tìm thấy nhân viên');
    }

    const schedule = await this.scheduleRepo.findById(scheduleId);
    if (!schedule) {
      throw new NotFoundError('Không tìm thấy ca làm việc');
    }

    const isAssigned = schedule.assigned_staff.some((id) => id.equals(staff._id as Types.ObjectId));
    if (!isAssigned) {
      throw new ForbiddenError('Bạn không được xếp vào ca làm việc này');
    }

    // Đảm bảo có record (phòng trường hợp record chưa được tạo khi assign)
    let attendance = await this.attendanceRepo.findByScheduleAndStaff(scheduleId, staff._id as Types.ObjectId);
    if (!attendance) {
      attendance = await this.attendanceRepo.createPlaceholder({
        schedule_id: scheduleId,
        staff_id: staff._id as Types.ObjectId,
        branch_id: schedule.branch_id,
      });
    }

    // Validate thời gian Check-in
    const now = new Date();
    const [h, m] = schedule.start_time.split(':');
    const dateStr = new Date(schedule.shift_date).toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
    const shiftStart = new Date(`${dateStr}T${h.padStart(2, '0')}:${m.padStart(2, '0')}:00+07:00`);

    const earliestAllowed = new Date(shiftStart.getTime() - 30 * 60 * 1000);
    const deadline = new Date(shiftStart.getTime() + 30 * 60 * 1000);

    if (now < earliestAllowed) {
      throw new BadRequestError('Chưa đến giờ Check-in (chỉ được Check-in trước 30 phút)');
    }

    if (now > deadline) {
      await this.attendanceRepo.markAbsent((attendance!._id as Types.ObjectId).toString());
      throw new BadRequestError('Đã quá thời gian Check-in (trễ hơn 30 phút). Ca này đã bị đánh dấu vắng mặt.');
    }


    if (attendance!.status === AttendanceStatus.CHECKED_IN || attendance!.status === AttendanceStatus.CHECKED_OUT) {
      throw new BadRequestError('Ca này đã được check-in trước đó');
    }

    if (attendance!.status === AttendanceStatus.ABSENT) {
      throw new BadRequestError('Ca này đã bị đánh dấu vắng, không thể check-in');
    }

    const updated = await this.attendanceRepo.checkIn((attendance!._id as Types.ObjectId).toString(), new Date());
    if (!updated) {
      throw new BadRequestError('Check-in thất bại');
    }

    return {
      attendance: updated as any,
      message: 'Check-in thành công',
    };
  }

  /**
   * Check-out cho một ca làm việc
   * Người thực hiện: Staff (chính chủ)
   * Điều kiện: Staff phải đã check-in trước đó
   */
  async checkOut(userId: string, scheduleId: string): Promise<ICheckOutResponse> {
    const staff = await this.staffRepo.findByUserId(userId);
    if (!staff) {
      throw new NotFoundError('Không tìm thấy nhân viên');
    }

    const attendance = await this.attendanceRepo.findByScheduleAndStaff(scheduleId, staff._id as Types.ObjectId);
    if (!attendance) {
      throw new NotFoundError('Không tìm thấy bản ghi chấm công cho ca này');
    }

    if (attendance.status !== AttendanceStatus.CHECKED_IN) {
      throw new BadRequestError('Bạn cần check-in trước khi check-out, hoặc đã check-out rồi');
    }

    const updated = await this.attendanceRepo.checkOut((attendance._id as Types.ObjectId).toString(), new Date());
    if (!updated) {
      throw new BadRequestError('Check-out thất bại');
    }

    return {
      attendance: updated as any,
      message: 'Check-out thành công',
    };
  }

  /**
   * Lấy lịch sử chấm công của staff hiện tại
   */
  async getMyAttendance(userId: string) {
    const staff = await this.staffRepo.findByUserId(userId);
    if (!staff) {
      throw new NotFoundError('Không tìm thấy nhân viên');
    }
    return this.attendanceRepo.findByStaff(staff._id as Types.ObjectId);
  }

  /**
   * Lấy danh sách chấm công theo ca (dành cho Manager)
   */
  async getByScheduleId(managerId: string, scheduleId: string) {
    const manager = await this.staffRepo.findByUserId(managerId);
    // Cho phép mọi staff xem, nếu cần giới hạn quyền Manager thì bổ sung check role ở đây

    const schedule = await this.scheduleRepo.findById(scheduleId);
    if (!schedule) {
      throw new NotFoundError('Không tìm thấy ca làm việc');
    }

    return this.attendanceRepo.findBySchedule(scheduleId);
  }

  /**
   * Lấy danh sách chấm công theo chi nhánh (dành cho Manager/Admin)
   */
  async getByBranch(branchId: string) {
    return this.attendanceRepo.findByBranch(branchId);
  }
}

export const attendanceService = new AttendanceService();