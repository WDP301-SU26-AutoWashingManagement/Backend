import cron from 'node-cron';
import { attendanceRepository } from '../repositories/attendance.repository';
import { CronLog } from '../../../models/cronLog.model';
import { AttendanceStatus } from '../../../models/attendance.model';

const GRACE_PERIOD_MINUTES = 30;

function combineDateTime(shiftDate: Date, timeStr: string): Date {
  const [h, m] = timeStr.split(':').map(Number);
  const d = new Date(shiftDate);
  d.setHours(h, m, 0, 0);
  return d;
}

export class AttendanceCronService {
  private readonly attendanceRepo = attendanceRepository;
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
    const pending = await this.attendanceRepo.findPendingWithSchedule();

    let markedCount = 0;

    for (const att of pending) {
      const schedule = att.schedule_id as any;
      if (!schedule || !schedule.shift_date || !schedule.start_time) continue;

      const shiftStart = combineDateTime(schedule.shift_date, schedule.start_time);
      const deadline = new Date(shiftStart.getTime() + GRACE_PERIOD_MINUTES * 60 * 1000);

      if (now > deadline) {
        await this.attendanceRepo.markAbsent((att._id as any).toString());
        markedCount += 1;
      }
    }

    return markedCount;
  }
}

export const attendanceCronService = new AttendanceCronService();