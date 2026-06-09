import cron from "node-cron";
import { ObjectId, Types } from "mongoose";
import { scheduleRepository } from "../repositories/schedule.repository";
import { splitTimeRange } from "../utils/slot-separate";
import { runWithRetry } from "../utils/retry-cron";

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
    private isRunning = false;

    init() {
        cron.schedule("0 0 * * 0", async () => {
            if (this.isRunning) return;

            this.isRunning = true;

            try {
                console.log("[CRON] Start weekly schedule generation");

                await this.generateNextWeekSchedules();

                console.log("[CRON] Done weekly schedule generation");
            } catch (error) {
                console.error("[CRON ERROR]", error);
            } finally {
                this.isRunning = false;
            }
        });
    }

    async generateNextWeekSchedules() {
        const templates = await this.getShiftTemplates();
        const nextWeekDates = this.getNextWeekDates();

        for (const tpl of templates) {
            await Promise.allSettled(
                templates.map(tpl =>
                    this.processBranchSchedules(tpl, nextWeekDates)
                )
            );
        }
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

        await this.bulkInsert(data);
    }

    async bulkInsert(data: any[]) {
        const chunkSize = 500;

        for (let i = 0; i < data.length; i += chunkSize) {
            await this.scheduleRepo.insertMany(data.slice(i, i + chunkSize));
        }
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
        const templates = await this.scheduleRepo.getTemplates();

        return templates
            .filter(
                (tpl): tpl is typeof tpl & {
                    branch_id: NonNullable<typeof tpl.branch_id>;
                    start_time: string;
                    end_time: string;
                } =>
                    !!tpl.branch_id &&
                    !!tpl.start_time &&
                    !!tpl.end_time
            )
            .map(tpl => ({
                branch_id: tpl.branch_id.toString(),
                start_time: tpl.start_time,
                end_time: tpl.end_time,
                max_staff: tpl.max_staff ?? 1,
                algorithm: tpl.algorithm ?? "least_workload",
                shift_minutes: tpl.shift_minutes ?? 120,
            }));
    }
}