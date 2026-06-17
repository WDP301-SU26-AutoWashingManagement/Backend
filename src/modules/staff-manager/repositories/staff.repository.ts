import { StaffRole } from '@common/types/enum';
import { BaseRepository } from '../../../common/repositories/base.repository';
import { Staff, IStaff } from '../../../models/staff.model';
import { IPaginatedStaffResponse, IStaffResponse, SortableStaffField } from '../dto/staff.dto';
import { Types } from 'mongoose';

export class StaffRepository extends BaseRepository<IStaff> {
    constructor() {
        super(Staff);
    }

    async findByUserId(userId: string) {
        return this.model.findOne({ user_id: userId }).exec();
    }

    async findByRole(role: string) {
        return this.model.find({ role }).exec();
    }

    async findAllActive() {
        return this.model.find({ is_active: true }).exec();
    }

    async findManagersByBranch(branchId: string) {
        return this.model.find({
            branch_id: branchId,
            staff_type: StaffRole.MANAGER,
        }).exec();
    }

    async findByStaffCode(staffCode: string): Promise<IStaff | null> {
        return await Staff.findOne({ staff_code: staffCode });
    }

    async findAll(
        filters: {
            staff_type?: StaffRole;
            branch_id?: string | Types.ObjectId;
            search?: string;
        },
        pagination: {
            page: number;
            limit: number;
        },
        sort: {
            field: SortableStaffField;
            order: "asc" | "desc";
        }
    ): Promise<IPaginatedStaffResponse> {
        const { staff_type, branch_id, search } = filters;
        const { page, limit } = pagination;
        const { field, order } = sort;
 
        // Build query
        const query: any = {};
 
        if (staff_type) {
            query.staff_type = staff_type;
        }
 
        if (branch_id && Types.ObjectId.isValid(branch_id)) {
            query.branch_id = new Types.ObjectId(branch_id);
        }
 
        // Search by staff_code using regex
        if (search) {
            query.staff_code = { $regex: search, $options: "i" };
        }
 
        // Calculate pagination
        const skip = (page - 1) * limit;
 
        // Build sort object
        const sortObj: any = {};
        sortObj[field] = order === "asc" ? 1 : -1;
 
        // Execute queries
        const [data, total] = await Promise.all([
            Staff.find(query)
                .sort(sortObj)
                .skip(skip)
                .limit(limit)
                .lean(),
            Staff.countDocuments(query),
        ]);
 
        const totalPages = Math.ceil(total / limit);
 
        return {
            data: data.map(staff => this.mapToResponse(staff)),
            pagination: {
                page,
                limit,
                total,
                total_pages: totalPages,
                has_next: page < totalPages,
                has_prev: page > 1,
            },
        };
    }

    async findAllWithSort(
        sort: {
            field: SortableStaffField;
            order: "asc" | "desc";
        },
        pagination: {
            page: number;
            limit: number;
        }
    ): Promise<IPaginatedStaffResponse> {
        return this.findAll({}, pagination, sort);
    }
 
    /**
     * Find all staff by branch
     */
    async findByBranch(branchId: string | Types.ObjectId): Promise<IStaff[]> {
        if (!Types.ObjectId.isValid(branchId)) {
            return [];
        }
        return await Staff.find({
            branch_id: new Types.ObjectId(branchId),
        });
    }
 
    /**
     * Count staff by type
     */
    async countByType(staffType: StaffRole): Promise<number> {
        return await Staff.countDocuments({ staff_type: staffType });
    }
 
    /**
     * Check if staff code exists
     */
    async staffCodeExists(staffCode: string, excludeId?: string): Promise<boolean> {
        const query: any = { staff_code: staffCode };
        if (excludeId) {
            query._id = { $ne: new Types.ObjectId(excludeId) };
        }
        const count = await Staff.countDocuments(query);
        return count > 0;
    }
 
    /**
     * Get total leave days summary for a staff
     */
    async getLeaveSummary(staffId: string | Types.ObjectId): Promise<{
        annual_leave_days: number;
        used_leave_days: number;
        available_leave_days: number;
    } | null> {
        const staff = await this.findById(staffId.toString());
        if (!staff) return null;
 
        return {
            annual_leave_days: staff.annual_leave_days,
            used_leave_days: staff.used_leave_days,
            available_leave_days: staff.annual_leave_days - staff.used_leave_days,
        };
    }
 
    /**
     * Bulk update used leave days
     */
    async updateUsedLeaveDays(
        staffId: string | Types.ObjectId,
        additionalDays: number
    ): Promise<IStaff | null> {
        if (!Types.ObjectId.isValid(staffId)) {
            return null;
        }
        return await Staff.findByIdAndUpdate(
            staffId,
            { $inc: { used_leave_days: additionalDays } },
            { new: true, runValidators: true }
        );
    }
 
    /**
     * Map staff document to response format
     */
    private mapToResponse(staff: any): IStaffResponse {
        return {
            _id: staff._id.toString(),
            user_id: staff.user_id.toString(),
            branch_id: staff.branch_id ? staff.branch_id.toString() : null,
            staff_code: staff.staff_code,
            staff_type: staff.staff_type,
            hire_date: staff.hire_date,
            hour_per_week: staff.hour_per_week,
            salary_coefficient: staff.salary_coefficient,
            annual_leave_days: staff.annual_leave_days,
            used_leave_days: staff.used_leave_days,
            createdAt: staff.createdAt,
            updatedAt: staff.updatedAt,
        };
    }
}

export const staffRepository = new StaffRepository();