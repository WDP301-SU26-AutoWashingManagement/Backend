import cron from "node-cron";
import { ObjectId, Types } from "mongoose";
import { scheduleRepository } from "../repositories/schedule.repository";
import { splitTimeRange } from "../utils/slot-separate";
import { runWithRetry } from "../utils/retry-cron";
import { staffRepository } from "../repositories/staff.repository";
import { branchRepository } from '../../boss/repositories/branch.repository';
import { ISchedule } from "src/models/schedule.model";
import { CronLog } from "../../../models/cronLog.model";

type ShiftTemplate = {
    branch_id: string;
    start_time: string;
    end_time: string;
    max_staff: number;
    algorithm?: string;
    shift_minutes?: number;
};

export class ScheduleCronService {
    private readonly scheduleRepo = scheduleRepository;
    private readonly staffRepo = staffRepository;
    private isGenerating = false;
    private isAssigning = false;

    private async saveLog(message: string, status: 'info' | 'success' | 'warning' | 'error' = 'info') {
        console.log(`[CRON LOG - ${status.toUpperCase()}] ${message}`);
        try {
            await CronLog.create({ message, status, timestamp: new Date() });
            
            // Optional: Cleanup old logs (keep only last 100)
            const count = await CronLog.countDocuments();
            if (count > 100) {
                const oldestLogs = await CronLog.find().sort({ timestamp: 1 }).limit(count - 100);
                const idsToDelete = oldestLogs.map(log => log._id);
                await CronLog.deleteMany({ _id: { $in: idsToDelete } });
            }
        } catch (err) {
            console.error("Error saving cron log", err);
        }
    }

    init() {
        // Generate schedules
         console.log("[CRON] ScheduleCronService initialized");
        cron.schedule("* * * * *", async () => {
            if (this.isGenerating) return;

            this.isGenerating = true;

            try {
                await this.saveLog("Bắt đầu tự động tạo khung lịch làm việc cho tuần tới...", "info");

                await this.generateNextWeekSchedules();

                await this.saveLog("Hoàn tất tạo khung lịch làm việc.", "success");
            } catch (error: any) {
                await this.saveLog(`Lỗi khi tạo khung lịch: ${error.message}`, "error");
            } finally {
                this.isGenerating = false;
            }
        });

        // Auto assign staff
        cron.schedule("10 * * * * *", async () => {
            if (this.isAssigning) return;

            this.isAssigning = true;

            try {
                // To avoid spamming the log every minute, we only log if it actually did something
                // Let's modify assignRandomStaffToSchedules to return assigned count
                const assignedCount = await this.assignRandomStaffToSchedules();
                if (assignedCount > 0) {
                    await this.saveLog(`Đã tự động xếp ca cho ${assignedCount} lượt nhân viên.`, "success");
                }
            } catch (error: any) {
                await this.saveLog(`Lỗi khi tự động xếp ca: ${error.message}`, "error");
            } finally {
                this.isAssigning = false;
            }
        });
    }

    async generateNextWeekSchedules() {
        const templates = await this.getShiftTemplates();
        const currentWeekDates = this.getCurrentWeekDates();
        const nextWeekDates = this.getNextWeekDates();

        console.log('[CRON] Templates:', templates.length);

        // Generate for current week
        await Promise.allSettled(
            templates.map(tpl =>
                this.processBranchSchedules(tpl, currentWeekDates)
            )
        );

        // Generate for next week
        await Promise.allSettled(
            templates.map(tpl =>
                this.processBranchSchedules(tpl, nextWeekDates)
            )
        );
    }

    async processBranchSchedules(
        tpl: ShiftTemplate,
        nextWeekDates: Date[]
    ) {
        const branchId = tpl.branch_id;

        await runWithRetry(
            () => this.buildAndInsertBranchSchedules(tpl, nextWeekDates),
            "schedule-cron",
            `Branch-${branchId}`
        );
    }

    async buildAndInsertBranchSchedules(
        tpl: ShiftTemplate,
        nextWeekDates: Date[]
    ) {
        const branchId = tpl.branch_id;

        // Check duplicate
        const existed = await this.scheduleRepo.findOne({
            branch_id: branchId,
            shift_date: {
                $gte: nextWeekDates[0],
                $lte: nextWeekDates[6],
            },
        });

        if (existed) {
            console.log(`[CRON] Skip branch ${tpl.branch_id} (already exists)`);
            return;
        }

        // Build schedules
        const data: any[] = [];

        for (const date of nextWeekDates) {
            const slots = splitTimeRange(
                tpl.start_time,
                tpl.end_time,
                tpl.shift_minutes ?? 120
            );

            for (const slot of slots) {
                data.push({
                    branch_id: branchId,
                    shift_date: date,
                    start_time: slot.start,
                    end_time: slot.end,
                    shift_status: "open",
                    max_staff: tpl.max_staff,
                    algorithm: tpl.algorithm ?? "least_workload",
                    assigned_staff: [],
                });
            }
        }
        console.log(
            `[CRON] Branch ${branchId} creating ${data.length} schedules`
        );
        await this.bulkInsert(data);
    }

    async bulkInsert(data: any[]) {
        const chunkSize = 500;

        for (let i = 0; i < data.length; i += chunkSize) {
            const chunk = data.slice(i, i + chunkSize);

            const result = await this.scheduleRepo.insertMany(chunk);
            console.log(
                '[CRON] Inserted:',
                result?.length ?? 0
            );
        }
    }

    getCurrentWeekDates(): Date[] {
        const result: Date[] = [];
        const now = new Date();

        const day = now.getDay();
        const diffToMonday = day === 0 ? -6 : 1 - day;

        const monday = new Date(now);
        monday.setDate(now.getDate() + diffToMonday);
        monday.setHours(0, 0, 0, 0);

        for (let i = 0; i < 7; i++) {
            const d = new Date(monday);
            d.setDate(monday.getDate() + i);
            result.push(d);
        }

        return result;
    }

    getNextWeekDates(): Date[] {
        const result: Date[] = [];
        const now = new Date();

        const day = now.getDay();
        const diffToMonday = day === 0 ? 1 : 8 - day;

        const nextMonday = new Date(now);
        nextMonday.setDate(now.getDate() + diffToMonday);
        nextMonday.setHours(0, 0, 0, 0);

        for (let i = 0; i < 7; i++) {
            const d = new Date(nextMonday);
            d.setDate(nextMonday.getDate() + i);
            result.push(d);
        }

        return result;
    }

    async getShiftTemplates(): Promise<ShiftTemplate[]> {
        const branches = await branchRepository.find({});
        const branchIds = new Set(branches.map(b => b._id.toString()));

        // Build default template cho tất cả branches
        const defaultTemplates = new Map<string, ShiftTemplate>(
            branches.map(branch => [
                branch._id.toString(),
                {
                    branch_id: branch._id.toString(),
                    start_time: '08:00',
                    end_time: '18:00',
                    max_staff: 5,
                    algorithm: 'least_workload',
                    shift_minutes: 120,
                }
            ])
        );

        // Override bằng template từ schedule thực tế (nếu có)
        const lastWeek = new Date();
        lastWeek.setDate(lastWeek.getDate() - 7);

        const schedules = await this.scheduleRepo.find({
            shift_date: { $gte: lastWeek },
        });

        for (const s of schedules) {
            const branchId = s.branch_id.toString();
            if (!branchIds.has(branchId)) continue; // branch đã bị xóa

            // Dùng key branch_id-start-end để handle multi-shift per branch
            const key = `${branchId}-${s.start_time}-${s.end_time}`;
            defaultTemplates.set(key, {
                branch_id: branchId,
                start_time: s.start_time,
                end_time: s.end_time,
                max_staff: s.max_staff ?? 5,
                algorithm: s.algorithm ?? 'least_workload',
                shift_minutes: s.shift_minutes ?? 120,
            });

            // Xóa default key (branch_id) nếu đã có template thực
            defaultTemplates.delete(branchId);
        }

        return Array.from(defaultTemplates.values());
    }

    async assignRandomStaffToSchedules(): Promise<number> {
        const schedules = await this.scheduleRepo.find({
            $expr: {
                $lt: [
                    { $size: "$assigned_staff" },
                    "$max_staff"
                ]
            }
        });
        
        let totalAssigned = 0;
        for (const schedule of schedules) {
            const assigned = await this.fillSchedule(schedule);
            totalAssigned += assigned;
        }
        return totalAssigned;
    }

    private async fillSchedule(schedule: any): Promise<number> {
        const currentStaffIds = schedule.assigned_staff.map(
            (id: Types.ObjectId) => id.toString()
        );

        const remainSlot =
            schedule.max_staff - schedule.assigned_staff.length;

        if (remainSlot <= 0) return 0;

        const staffs = await this.staffRepo.find({
            branch_id: schedule.branch_id,
            _id: {
                $nin: currentStaffIds,
            },
        });

        if (!staffs.length) return 0;

        const shuffled = staffs.sort(() => Math.random() - 0.5);

        const selected = shuffled
            .slice(0, remainSlot)
            .map(staff => staff._id);

        if (!selected.length) return 0;

        await this.scheduleRepo.updateById(
            schedule._id.toString(),
            {
                $push: {
                    assigned_staff: {
                        $each: selected,
                    },
                },
            }
        );

        return selected.length;
    }
}

export const scheduleCronService = new ScheduleCronService();