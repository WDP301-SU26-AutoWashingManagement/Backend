import {staffRepository} from "../repositories/staff.repository";
import {
    ICreateStaffRequest,
    IUpdateStaffRequest,
    IListStaffQuery,
    IStaffResponse,
    IStaffDetailResponse,
    IPaginatedStaffResponse,
    IValidationResult,
    IStaffValidationError,
    isValidSortField,
} from "../dto/staff.dto";
import { StaffRole } from "../../../common/types/enum";
import mongoose from "mongoose";
import { Types } from "mongoose";
import { IUser } from "../../../models/user.model";

export class StaffService {
    /**
     * Create new staff
     */
    async createStaff(data: ICreateStaffRequest): Promise<IStaffResponse> {
        // Validate input
        const validation = this.validateCreateStaff(data);
        if (!validation.isValid) {
            throw new Error(`Validation error: ${validation.errors.map(e => e.message).join(", ")}`);
        }

        // Check if user_id is valid ObjectId
        if (!mongoose.Types.ObjectId.isValid(data.user_id)) {
            throw new Error("Invalid user_id format");
        }

        // Check if user already has a staff record
        const existingStaff = await staffRepository.findByUserId(data.user_id);
        if (existingStaff) {
            throw new Error("User already has a staff record");
        }

        // Create staff
        const staffData = {
            user_id: new Types.ObjectId(data.user_id),
            branch_id: data.branch_id ? new Types.ObjectId(data.branch_id) : null,
            staff_type: data.staff_type,
            hire_date: data.hire_date || new Date(),
            hour_per_week: data.hour_per_week || 40,
            salary_coefficient: data.salary_coefficient || 1,
            annual_leave_days: data.annual_leave_days || 12,
            used_leave_days: data.used_leave_days || 0,
        };

        const staff = await staffRepository.create(staffData);
        return this.mapToResponse(staff);
    }

    /**
     * Get staff by ID with details
     */
    async getStaffById(staffId: string): Promise<IStaffDetailResponse> {
        const staff = await staffRepository.findById(staffId);
        if (!staff) {
            throw new Error("Staff not found");
        }

        return this.mapToDetailResponse(staff);
    }

    /**
     * Get staff by staff_code
     */
    async getStaffByCode(staffCode: string): Promise<IStaffResponse> {
        const staff = await staffRepository.findByStaffCode(staffCode);
        if (!staff) {
            throw new Error("Staff not found");
        }

        return this.mapToResponse(staff);
    }

    /**
     * Update staff
     */
    async updateStaff(
        staffId: string,
        data: IUpdateStaffRequest
    ): Promise<IStaffResponse> {
        // Validate staff exists
        const existingStaff = await staffRepository.findById(staffId);
        if (!existingStaff) {
            throw new Error("Staff not found");
        }

        // Validate update data
        const validation = this.validateUpdateStaff(data);
        if (!validation.isValid) {
            throw new Error(`Validation error: ${validation.errors.map(e => e.message).join(", ")}`);
        }

        // Prepare update data
        const updateData: any = {};

        if (data.branch_id !== undefined) {
            updateData.branch_id = data.branch_id 
                ? new mongoose.Types.ObjectId(data.branch_id) 
                : null;
        }

        if (data.hour_per_week !== undefined) {
            updateData.hour_per_week = data.hour_per_week;
        }

        if (data.salary_coefficient !== undefined) {
            updateData.salary_coefficient = data.salary_coefficient;
        }

        if (data.annual_leave_days !== undefined) {
            updateData.annual_leave_days = data.annual_leave_days;
        }

        if (data.used_leave_days !== undefined) {
            updateData.used_leave_days = data.used_leave_days;
        }

        if (data.hire_date !== undefined) {
            updateData.hire_date = data.hire_date;
        }

        if (data.staff_type !== undefined) {
            updateData.staff_type = data.staff_type;
        }

        const updatedStaff = await staffRepository.updateById(staffId, updateData);
        if (!updatedStaff) {
            throw new Error("Failed to update staff");
        }

        return this.mapToResponse(updatedStaff);
    }

    /**
     * Delete staff
     */
    async deleteStaff(staffId: string): Promise<boolean> {
        const existingStaff = await staffRepository.findById(staffId);

        if (!existingStaff) {
            throw new Error("Staff not found");
        }

        const deleted = await staffRepository.deleteById(staffId);

        return deleted !== null;
    }
    /**
     * Get staff list with filters and sorting
     */
    async getStaffList(query: IListStaffQuery): Promise<IPaginatedStaffResponse> {
        const page = Math.max(1, query.page || 1);
        const limit = Math.min(Math.max(1, query.limit || 10), 100); // Max 100

        // Validate sort field
        let sortField = "createdAt";
        if (query.sort_by && isValidSortField(query.sort_by)) {
            sortField = query.sort_by;
        }

        const sortOrder = query.sort_order === "asc" ? "asc" : "desc";

        // Build filters
        const filters: any = {};
        if (query.staff_type) {
            filters.staff_type = query.staff_type;
        }
        if (query.branch_id && mongoose.Types.ObjectId.isValid(query.branch_id)) {
            filters.branch_id = query.branch_id;
        }
        if (query.search) {
            filters.search = query.search;
        }

        return await staffRepository.findAll(
            filters,
            { page, limit },
            { field: sortField as any, order: sortOrder }
        );
    }

    /**
     * Get staff list sorted by specific field
     */
    async getStaffListSorted(
        sortField: string = "hire_date",
        sortOrder: "asc" | "desc" = "desc",
        page: number = 1,
        limit: number = 10
    ): Promise<IPaginatedStaffResponse> {
        if (!isValidSortField(sortField)) {
            throw new Error(`Invalid sort field. Valid fields are: ${["hire_date", "staff_code", "salary_coefficient", "hour_per_week"].join(", ")}`);
        }

        const validPage = Math.max(1, page);
        const validLimit = Math.min(Math.max(1, limit), 100);

        return await staffRepository.findAllWithSort(
            { field: sortField as any, order: sortOrder },
            { page: validPage, limit: validLimit }
        );
    }

    /**
     * Get staff list by branch
     */
    async getStaffByBranch(branchId: string): Promise<IStaffResponse[]> {
        if (!mongoose.Types.ObjectId.isValid(branchId)) {
            throw new Error("Invalid branch_id format");
        }

        const staffList = await staffRepository.findByBranch(branchId);
        return staffList.map(staff => this.mapToResponse(staff));
    }

    /**
     * Get leave summary for a staff
     */
    async getLeaveSummary(staffId: string) {
        if (!mongoose.Types.ObjectId.isValid(staffId)) {
            throw new Error("Invalid staff_id format");
        }

        const summary = await staffRepository.getLeaveSummary(staffId);
        if (!summary) {
            throw new Error("Staff not found");
        }

        return summary;
    }

    /**
     * Update used leave days
     */
    async addUsedLeaveDays(staffId: string, days: number): Promise<IStaffResponse> {
        if (!mongoose.Types.ObjectId.isValid(staffId)) {
            throw new Error("Invalid staff_id format");
        }

        if (days < 0) {
            throw new Error("Days must be positive number");
        }

        const staff = await staffRepository.findById(staffId);
        if (!staff) {
            throw new Error("Staff not found");
        }

        if (staff.used_leave_days + days > staff.annual_leave_days) {
            throw new Error("Insufficient leave days available");
        }

        const updated = await staffRepository.updateUsedLeaveDays(staffId, days);
        if (!updated) {
            throw new Error("Failed to update leave days");
        }

        return this.mapToResponse(updated);
    }

    /**
     * Validation: Create staff
     */
    private validateCreateStaff(data: ICreateStaffRequest): IValidationResult {
        const errors: IStaffValidationError[] = [];

        if (!data.user_id || typeof data.user_id !== "string") {
            errors.push({ field: "user_id", message: "user_id is required and must be a string" });
        }

        if (!data.staff_type || !Object.values(StaffRole).includes(data.staff_type)) {
            errors.push({ field: "staff_type", message: "Invalid staff_type" });
        }

        if (data.hour_per_week !== undefined && data.hour_per_week < 0) {
            errors.push({ field: "hour_per_week", message: "hour_per_week must be >= 0" });
        }

        if (data.salary_coefficient !== undefined && data.salary_coefficient < 0) {
            errors.push({ field: "salary_coefficient", message: "salary_coefficient must be >= 0" });
        }

        if (data.annual_leave_days !== undefined && data.annual_leave_days < 0) {
            errors.push({ field: "annual_leave_days", message: "annual_leave_days must be >= 0" });
        }

        if (data.used_leave_days !== undefined && data.used_leave_days < 0) {
            errors.push({ field: "used_leave_days", message: "used_leave_days must be >= 0" });
        }

        return {
            isValid: errors.length === 0,
            errors,
        };
    }

    /**
     * Validation: Update staff
     */
    private validateUpdateStaff(data: IUpdateStaffRequest): IValidationResult {
        const errors: IStaffValidationError[] = [];

        if (data.staff_type && !Object.values(StaffRole).includes(data.staff_type)) {
            errors.push({ field: "staff_type", message: "Invalid staff_type" });
        }

        if (data.hour_per_week !== undefined && data.hour_per_week < 0) {
            errors.push({ field: "hour_per_week", message: "hour_per_week must be >= 0" });
        }

        if (data.salary_coefficient !== undefined && data.salary_coefficient < 0) {
            errors.push({ field: "salary_coefficient", message: "salary_coefficient must be >= 0" });
        }

        if (data.annual_leave_days !== undefined && data.annual_leave_days < 0) {
            errors.push({ field: "annual_leave_days", message: "annual_leave_days must be >= 0" });
        }

        if (data.used_leave_days !== undefined && data.used_leave_days < 0) {
            errors.push({ field: "used_leave_days", message: "used_leave_days must be >= 0" });
        }

        return {
            isValid: errors.length === 0,
            errors,
        };
    }

    /**
     * Map staff document to response
     */
    private mapToResponse(staff: any): IStaffResponse {
        const user = staff.user_id as Partial<IUser>; // đã populated
        console.log("DEBUG USER:", user)
        return {
            _id: staff._id.toString(),
            user_id: user?._id?.toString() ?? staff.user_id?.toString(),
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

            email: user?.email ?? null,
            full_name: user?.full_name ?? null,
            avatar_url: user?.avatar_url ?? null,
            phone: user?.phone ?? null,
            is_active: user?.is_active ?? null,
        };
    }

    /**
     * Map staff document to detail response
     */
    private mapToDetailResponse(staff: any): IStaffDetailResponse {
        return {
            ...this.mapToResponse(staff),
            available_leave_days: staff.annual_leave_days - staff.used_leave_days,
        };
    }
}

export const staffService = new StaffService();