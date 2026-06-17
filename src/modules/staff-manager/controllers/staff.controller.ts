import { Request, Response } from "express";
import {staffService} from "../services/staff.service";
import { IListStaffQuery, IApiResponse } from "../dto/staff.dto";

export class StaffController {
    /**
     * POST /api/staff
     * Create new staff
     */
    async create(req: Request, res: Response): Promise<void> {
        try {
            const staffData = req.body;
            const result = await staffService.createStaff(staffData);

            const response: IApiResponse<any> = {
                success: true,
                code: 201,
                message: "Staff created successfully",
                data: result,
            };

            res.status(201).json(response);
        } catch (error: any) {
            const response: IApiResponse<null> = {
                success: false,
                code: 400,
                message: "Failed to create staff",
                error: error.message,
            };

            res.status(400).json(response);
        }
    }

    /**
     * GET /api/staff/:id
     * Get staff by ID with details
     */
    async getById(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const result = await staffService.getStaffById(id);

            const response: IApiResponse<any> = {
                success: true,
                code: 200,
                message: "Staff retrieved successfully",
                data: result,
            };

            res.status(200).json(response);
        } catch (error: any) {
            const statusCode = error.message.includes("not found") ? 404 : 400;
            const response: IApiResponse<null> = {
                success: false,
                code: statusCode,
                message: "Failed to retrieve staff",
                error: error.message,
            };

            res.status(statusCode).json(response);
        }
    }

    /**
     * GET /api/staff/code/:staffCode
     * Get staff by staff code
     */
    async getByCode(req: Request, res: Response): Promise<void> {
        try {
            const { staffCode } = req.params;
            const result = await staffService.getStaffByCode(staffCode);

            const response: IApiResponse<any> = {
                success: true,
                code: 200,
                message: "Staff retrieved successfully",
                data: result,
            };

            res.status(200).json(response);
        } catch (error: any) {
            const statusCode = error.message.includes("not found") ? 404 : 400;
            const response: IApiResponse<null> = {
                success: false,
                code: statusCode,
                message: "Failed to retrieve staff",
                error: error.message,
            };

            res.status(statusCode).json(response);
        }
    }

    /**
     * GET /api/staff
     * Get staff list with filters and pagination
     * Query parameters:
     *   - page: number (default: 1)
     *   - limit: number (default: 10)
     *   - sort_by: string (field name)
     *   - sort_order: "asc" | "desc" (default: "desc")
     *   - staff_type: string (filter)
     *   - branch_id: string (filter)
     *   - search: string (search by staff_code)
     */
    async getList(req: Request, res: Response): Promise<void> {
        try {
            const query: IListStaffQuery = {
                page: req.query.page ? parseInt(req.query.page as string) : 1,
                limit: req.query.limit ? parseInt(req.query.limit as string) : 10,
                sort_by: req.query.sort_by as string,
                sort_order: (req.query.sort_order as "asc" | "desc") || "desc",
                staff_type: req.query.staff_type as any,
                branch_id: req.query.branch_id as string,
                search: req.query.search as string,
            };

            const result = await staffService.getStaffList(query);

            const response: IApiResponse<any> = {
                success: true,
                code: 200,
                message: "Staff list retrieved successfully",
                data: result,
            };

            res.status(200).json(response);
        } catch (error: any) {
            const response: IApiResponse<null> = {
                success: false,
                code: 400,
                message: "Failed to retrieve staff list",
                error: error.message,
            };

            res.status(400).json(response);
        }
    }

    /**
     * GET /api/staff/sort/:sortField
     * Get staff list sorted by specific field
     * Query parameters:
     *   - sort_order: "asc" | "desc" (default: "desc")
     *   - page: number (default: 1)
     *   - limit: number (default: 10)
     */
    async getListSorted(req: Request, res: Response): Promise<void> {
        try {
            const { sortField } = req.params;
            const sortOrder = (req.query.sort_order as "asc" | "desc") || "desc";
            const page = req.query.page ? parseInt(req.query.page as string) : 1;
            const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;

            const result = await staffService.getStaffListSorted(sortField, sortOrder, page, limit);

            const response: IApiResponse<any> = {
                success: true,
                code: 200,
                message: "Staff list retrieved successfully",
                data: result,
            };

            res.status(200).json(response);
        } catch (error: any) {
            const response: IApiResponse<null> = {
                success: false,
                code: 400,
                message: "Failed to retrieve staff list",
                error: error.message,
            };

            res.status(400).json(response);
        }
    }

    /**
     * PUT /api/staff/:id
     * Update staff
     */
    async update(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const updateData = req.body;
            const result = await staffService.updateStaff(id, updateData);

            const response: IApiResponse<any> = {
                success: true,
                code: 200,
                message: "Staff updated successfully",
                data: result,
            };

            res.status(200).json(response);
        } catch (error: any) {
            const statusCode = error.message.includes("not found") ? 404 : 400;
            const response: IApiResponse<null> = {
                success: false,
                code: statusCode,
                message: "Failed to update staff",
                error: error.message,
            };

            res.status(statusCode).json(response);
        }
    }

    /**
     * DELETE /api/staff/:id
     * Delete staff
     */
    async delete(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const success = await staffService.deleteStaff(id);

            if (!success) {
                const response: IApiResponse<null> = {
                    success: false,
                    code: 404,
                    message: "Staff not found",
                };

                res.status(404).json(response);
                return;
            }

            const response: IApiResponse<null> = {
                success: true,
                code: 200,
                message: "Staff deleted successfully",
            };

            res.status(200).json(response);
        } catch (error: any) {
            const statusCode = error.message.includes("not found") ? 404 : 400;
            const response: IApiResponse<null> = {
                success: false,
                code: statusCode,
                message: "Failed to delete staff",
                error: error.message,
            };

            res.status(statusCode).json(response);
        }
    }

    /**
     * GET /api/staff/:id/leave-summary
     * Get leave days summary for a staff
     */
    async getLeaveSummary(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const result = await staffService.getLeaveSummary(id);

            const response: IApiResponse<any> = {
                success: true,
                code: 200,
                message: "Leave summary retrieved successfully",
                data: result,
            };

            res.status(200).json(response);
        } catch (error: any) {
            const statusCode = error.message.includes("not found") ? 404 : 400;
            const response: IApiResponse<null> = {
                success: false,
                code: statusCode,
                message: "Failed to retrieve leave summary",
                error: error.message,
            };

            res.status(statusCode).json(response);
        }
    }

    /**
     * POST /api/staff/:id/leave
     * Add used leave days
     * Body: { days: number }
     */
    async addUsedLeaveDays(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const { days } = req.body;

            if (typeof days !== "number" || days <= 0) {
                const response: IApiResponse<null> = {
                    success: false,
                    code: 400,
                    message: "Invalid request",
                    error: "days must be a positive number",
                };

                res.status(400).json(response);
                return;
            }

            const result = await staffService.addUsedLeaveDays(id, days);

            const response: IApiResponse<any> = {
                success: true,
                code: 200,
                message: "Leave days updated successfully",
                data: result,
            };

            res.status(200).json(response);
        } catch (error: any) {
            const statusCode = error.message.includes("not found") ? 404 : 400;
            const response: IApiResponse<null> = {
                success: false,
                code: statusCode,
                message: "Failed to update leave days",
                error: error.message,
            };

            res.status(statusCode).json(response);
        }
    }

    /**
     * GET /api/staff/branch/:branchId
     * Get all staff by branch
     */
    async getByBranch(req: Request, res: Response): Promise<void> {
        try {
            const { branchId } = req.params;
            const result = await staffService.getStaffByBranch(branchId);

            const response: IApiResponse<any> = {
                success: true,
                code: 200,
                message: "Staff list retrieved successfully",
                data: result,
            };

            res.status(200).json(response);
        } catch (error: any) {
            const response: IApiResponse<null> = {
                success: false,
                code: 400,
                message: "Failed to retrieve staff list",
                error: error.message,
            };

            res.status(400).json(response);
        }
    }
}

export const staffController =  new StaffController();