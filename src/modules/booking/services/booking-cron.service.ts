import cron from "node-cron";
import { Types } from "mongoose";
import { appointmentRepository } from "../repositories/appointment.repository";
import { BookingChecklist } from "../../../models/bookingChecklist.model";
import { BookingStatus, IAppointment } from "../../../models/appointment.model";
import { bookingService } from "../services/booking.service";
import { runWithRetry } from "../../../common/utils/retry-cron";
import { CronLog } from "../../../models/cronLog.model";

// requesterRole trong cancelBooking chỉ là string, không phải UserRole enum,
// nên dùng "system" để bypass nhánh ownership-check của CUSTOMER.
const SYSTEM_REQUESTER_ID = "000000000000000000000000";
const SYSTEM_ROLE = "system";

// Retry ít lần (không đủ ngưỡng >=5 lần fail) để tránh trigger gửi mail cảnh báo trong runWithRetry
const CRON_RETRIES = 3;
const CRON_RETRY_DELAY_MS = 2000;

export class BookingCronService {
    private readonly appointmentRepo = appointmentRepository;
    private isCancelling = false;

    private async saveLog(
        message: string,
        status: "info" | "success" | "warning" | "error" = "info"
    ) {
        console.log(`[CRON LOG - ${status.toUpperCase()}] ${message}`);
        try {
            await CronLog.create({ message, status, timestamp: new Date() });

            const count = await CronLog.countDocuments();
            if (count > 100) {
                const oldestLogs = await CronLog.find()
                    .sort({ timestamp: 1 })
                    .limit(count - 100);
                const idsToDelete = oldestLogs.map((log) => log._id);
                await CronLog.deleteMany({ _id: { $in: idsToDelete } });
            }
        } catch (err) {
            console.error("Error saving cron log", err);
        }
    }

    init() {
        console.log("[CRON] BookingCronService initialized");

        // Chạy mỗi phút: check các booking quá hạn 1 tiếng mà chưa có checklist
        cron.schedule("* * * * *", async () => {
            if (this.isCancelling) return;
            this.isCancelling = true;

            try {
                await this.saveLog(
                    "Bắt đầu kiểm tra và tự động hủy các booking quá hạn chưa checklist...",
                    "info"
                );

                const cancelledCount = await this.autoCancelOverdueBookings();

                if (cancelledCount > 0) {
                    await this.saveLog(
                        `Đã tự động hủy ${cancelledCount} booking quá hạn không có checklist.`,
                        "success"
                    );
                } else {
                    await this.saveLog(
                        "Không có booking nào cần tự động hủy.",
                        "info"
                    );
                }
            } catch (error: any) {
                await this.saveLog(
                    `Lỗi khi tự động hủy booking: ${error.message}`,
                    "error"
                );
            } finally {
                this.isCancelling = false;
            }
        });
    }

    /**
     * Tìm các appointment có scheduled_at + 1h < now, đang ở trạng thái
     * PENDING/CONFIRMED, và chưa có BookingChecklist tương ứng => tự động hủy.
     */
    async autoCancelOverdueBookings(): Promise<number> {
        const now = new Date();
        const threshold = new Date(now.getTime() - 60 * 60 * 1000); // now - 1h

        // scheduled_at + 1h < now  <=>  scheduled_at < now - 1h
        const overdueAppointments = await this.appointmentRepo.find({
            scheduled_at: { $lt: threshold },
            booking_status: {
                $in: [BookingStatus.PENDING, BookingStatus.CONFIRMED],
            },
        });

        if (!overdueAppointments.length) return 0;

        let cancelledCount = 0;

        for (const appointment of overdueAppointments) {
            const wasCancelled = await runWithRetry(
                () => this.cancelIfNoChecklist(appointment),
                "booking-cron",
                `Appointment-${appointment._id}`,
                CRON_RETRIES,
                CRON_RETRY_DELAY_MS
            );
            if (wasCancelled) cancelledCount++;
        }

        return cancelledCount;
    }

    private async cancelIfNoChecklist(appointment: IAppointment): Promise<boolean> {
        const appointmentId = (appointment._id as Types.ObjectId).toString();

        const checklist = await BookingChecklist.findOne({
            appointment_id: new Types.ObjectId(appointmentId),
        });

        if (checklist) return false; // đã có checklist -> bỏ qua, không throw để không bị retry vô ích

        await bookingService.cancelBooking(
            appointmentId,
            {
                cancellation_reason:
                    "Tự động hủy do quá hạn 1 tiếng mà chưa có checklist",
            },
            SYSTEM_REQUESTER_ID,
            SYSTEM_ROLE
        );

        console.log(`[CRON] Auto-cancelled appointment ${appointmentId}`);
        return true;
    }
}

export const bookingCronService = new BookingCronService();