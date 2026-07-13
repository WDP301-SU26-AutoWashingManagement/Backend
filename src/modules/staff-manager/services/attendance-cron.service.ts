import cron from 'node-cron';
import { attendanceRepository } from '../repositories/attendance.repository';
import { scheduleRepository } from '../repositories/schedule.repository';
import { CronLog } from '../../../models/cronLog.model';
import { AttendanceStatus } from '../../../models/attendance.model';
import { Types } from 'mongoose';

const GRACE_PERIOD_MINUTES = 30;

function combineDateTime(shiftDate: Date, timeStr: string): Date {
  const [h, m] = timeStr.split(':').map(Number);
  const d = new Date(shiftDate);
  d.setHours(h, m, 0, 0);
  return d;
}

export class AttendanceCronService {
  private readonly attendanceRepo = attendanceRepository;
  private readonly scheduleRepo = scheduleRepository;
  private isRunning = false;

  private async saveLog(message: string, status: 'info' | 'success' | 'warning' | 'error' = 'info') {
    console.log(`[CRON LOG - ${status.toUpperCase()}] ${message}`);
    try {
      await CronLog.create({ message, status, timestamp: new Date() });

      const count = await CronLog.countDocuments();
      if (count > 100) {
        const oldestLogs = await CronLog.find().sort({ timestamp: 1 }).limit(count - 100);
        const idsToDelete = oldestLogs.map((log) => log._id);
        await CronLog.deleteMany({ _id: { $in: idsToDelete } });
      }
    } catch (err) {
      console.error('Error saving cron log', err);
    }
  }

  init() {
    console.log('[CRON] AttendanceCronService initialized');

    // Chạy mỗi 5 phút, quét các bản ghi chưa check-in và đã quá 30p kể từ giờ bắt đầu ca
    cron.schedule('*/5 * * * *', async () => {
      if (this.isRunning) return;
      this.isRunning = true;

      try {
        const markedCount = await this.autoMarkAbsent();
        if (markedCount > 0) {
          await this.saveLog(`Đã tự động đánh dấu vắng cho ${markedCount} lượt nhân viên.`, 'success');
        }
      } catch (error: any) {
        await this.saveLog(`Lỗi khi tự động đánh dấu vắng: ${error.message}`, 'error');
      } finally {
        this.isRunning = false;
      }
    });
  }

  async autoMarkAbsent(): Promise<number> {
    const now = new Date();
    
    // Lấy tất cả ca làm việc của ngày hôm nay
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);

    const todaySchedules = await this.scheduleRepo.findByDateRange(startOfDay, endOfDay);
    
    let markedCount = 0;

    for (const schedule of todaySchedules) {
      if (!schedule.start_time) continue;
      
      const shiftStart = combineDateTime(schedule.shift_date, schedule.start_time);
      const deadline = new Date(shiftStart.getTime() + GRACE_PERIOD_MINUTES * 60 * 1000);

      // Nếu đã quá hạn Check-in
      if (now > deadline) {
        for (const staffId of schedule.assigned_staff) {
          // Kiểm tra xem staff đã có record chưa
          const att = await this.attendanceRepo.findByScheduleAndStaff(
            (schedule._id as Types.ObjectId).toString(),
            staffId.toString()
          );

          if (!att) {
            // Chưa từng check-in -> Tạo placeholder (mặc định NOT_CHECKED)
            const newAtt = await this.attendanceRepo.createPlaceholder({
              schedule_id: (schedule._id as Types.ObjectId).toString(),
              staff_id: staffId.toString(),
              branch_id: (schedule.branch_id as Types.ObjectId).toString()
            });
            
            // Cập nhật thành ABSENT ngay lập tức
            if (newAtt) {
              await this.attendanceRepo.markAbsent((newAtt._id as Types.ObjectId).toString());
              markedCount += 1;
            }
          } else if (att.status === AttendanceStatus.NOT_CHECKED) {
            // Có record nhưng đang pending -> Cập nhật thành Vắng mặt
            await this.attendanceRepo.markAbsent((att._id as Types.ObjectId).toString());
            markedCount += 1;
          }
        }
      }
    }

    return markedCount;
  }
}

export const attendanceCronService = new AttendanceCronService();