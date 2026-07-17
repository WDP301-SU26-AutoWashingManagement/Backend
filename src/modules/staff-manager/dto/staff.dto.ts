import { Types } from "mongoose";
import { StaffRole } from "../../../common/types/enum";

/**
 * ==================== REQUEST DTOs ====================
 */

export interface ICreateStaffRequest {
    user_id: string; // ObjectId as string
    branch_id?: string | null;
    staff_type: StaffRole;
    hire_date?: Date;
    hour_per_week?: number;
    salary_coefficient?: number;
    annual_leave_days?: number;
    used_leave_days?: number;
}

export interface IUpdateStaffRequest {
    branch_id?: string | null;
    hour_per_week?: number;
    salary_coefficient?: number;
    annual_leave_days?: number;
    used_leave_days?: number;
    hire_date?: Date;
    staff_type?: StaffRole;
    is_active?: boolean;
}

export interface IListStaffQuery {
    page?: number; // Default: 1
    limit?: number; // Default: 10, Max: 100
    sort_by?: string; // Field name to sort (e.g., "hire_date", "salary_coefficient")
    sort_order?: "asc" | "desc"; // Default: "desc"
    staff_type?: StaffRole; // Filter by staff type
    branch_id?: string; // Filter by branch
    search?: string; // Search by staff_code or user info
}


export interface IStaffResponse {
    _id: string;
    user_id: string;
    branch_id: string | null;
    staff_code: string;
    staff_type: StaffRole;
    hire_date: Date;
    hour_per_week: number;
    salary_coefficient: number;
    annual_leave_days: number;
    used_leave_days: number;
    createdAt: Date;
    updatedAt: Date;
    email: string | null;
    full_name: string | null;
    avatar_url?: string | null;
    phone?: string | null;
    is_active?: boolean | null;
}

export interface IStaffDetailResponse extends IStaffResponse {
    user?: {
        _id: string;
        name: string;
        email: string;
        phone: string;
    };
    branch?: {
        _id: string;
        branch_name: string;
    };
    available_leave_days: number; // Calculated: annual_leave_days - used_leave_days
}

export interface IPaginatedStaffResponse {
    data: IStaffResponse[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        total_pages: number;
        has_next: boolean;
        has_prev: boolean;
    };
}

export interface IApiResponse<T> {
    success: boolean;
    code: number;
    message: string;
    data?: T;
    error?: string;
}

export const STAFF_SORTABLE_FIELDS = [
    "staff_code",
    "staff_type",
    "hire_date",
    "hour_per_week",
    "salary_coefficient",
    "annual_leave_days",
    "used_leave_days",
    "createdAt",
    "updatedAt",
] as const;

export type SortableStaffField = typeof STAFF_SORTABLE_FIELDS[number];

export const isValidSortField = (field: string): field is SortableStaffField => {
    return STAFF_SORTABLE_FIELDS.includes(field as SortableStaffField);
};


export interface IStaffValidationError {
    field: string;
    message: string;
}

export interface IValidationResult {
    isValid: boolean;
    errors: IStaffValidationError[];
}