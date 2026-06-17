import { Request, Response, NextFunction } from "express";
import { IApiResponse } from "../dto/staff.dto";
import { Types } from "mongoose";

export const validateObjectId = (
    req: Request,
    res: Response,
    next: NextFunction
): void => {
    const { id } = req.params;
 
    if (!id || !Types.ObjectId.isValid(id)) {
        const response: IApiResponse<null> = {
            success: false,
            code: 400,
            message: "Invalid ID format",
            error: "ID must be a valid MongoDB ObjectId",
        };
 
        res.status(400).json(response);
        return;
    }
 
    next();
};
 
/**
 * Middleware to validate pagination parameters
 */
export const validatePagination = (
    req: Request,
    res: Response,
    next: NextFunction
): void => {
    const { page, limit } = req.query;
 
    if (page) {
        const pageNum = parseInt(page as string);
        if (isNaN(pageNum) || pageNum < 1) {
            const response: IApiResponse<null> = {
                success: false,
                code: 400,
                message: "Invalid pagination",
                error: "page must be a positive number",
            };
 
            res.status(400).json(response);
            return;
        }
    }
 
    if (limit) {
        const limitNum = parseInt(limit as string);
        if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
            const response: IApiResponse<null> = {
                success: false,
                code: 400,
                message: "Invalid pagination",
                error: "limit must be between 1 and 100",
            };
 
            res.status(400).json(response);
            return;
        }
    }
 
    next();
};
 
/**
 * Middleware to validate sort parameters
 */
export const validateSortParams = (
    req: Request,
    res: Response,
    next: NextFunction
): void => {
    const { sort_order } = req.query;
 
    if (sort_order && !["asc", "desc"].includes(sort_order as string)) {
        const response: IApiResponse<null> = {
            success: false,
            code: 400,
            message: "Invalid sort parameters",
            error: "sort_order must be 'asc' or 'desc'",
        };
 
        res.status(400).json(response);
        return;
    }
 
    next();
};
 
/**
 * Middleware to validate request body for creating staff
 */
export const validateCreateStaffBody = (
    req: Request,
    res: Response,
    next: NextFunction
): void => {
    const { user_id, staff_type } = req.body;
 
    if (!user_id || typeof user_id !== "string") {
        const response: IApiResponse<null> = {
            success: false,
            code: 400,
            message: "Validation error",
            error: "user_id is required and must be a string",
        };
 
        res.status(400).json(response);
        return;
    }
 
    if (!staff_type) {
        const response: IApiResponse<null> = {
            success: false,
            code: 400,
            message: "Validation error",
            error: "staff_type is required",
        };
 
        res.status(400).json(response);
        return;
    }
 
    next();
};

