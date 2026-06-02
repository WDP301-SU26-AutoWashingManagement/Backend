import { Request, Response, NextFunction } from "express";
import { branchService } from "../services/branch.service";
import { sendSuccess } from "@common/utils/apiResponse";

export class BranchController {
    private readonly branchService = branchService;

    getBranch = async(
        req: Request,
        res: Response,
        next: NextFunction,
    ) =>{
        try {
            const branch = await this.branchService.getBranch(
                req.params.id,
            );

            sendSuccess(
                res,
                branch,
                "Lấy thông tin chi nhánh thành công",
            );
        } catch (error) {
            next(error);
        }
    }

    getBranches = async (
        req: Request,
        res: Response,
        next: NextFunction,
    ) => {
        try {
            const branches = await this.branchService.getBranches();

            sendSuccess(
                res,
                branches,
                "Lấy danh sách chi nhánh thành công",
            );
        } catch (error) {
            next(error);
        }
    }

    createBranch = async (
        req: Request,
        res: Response,
        next: NextFunction,
    ) => {
        try {
            const branch = await this.branchService.createBranch(
                req.body,
            );
            
            if (!branch) 
                throw new Error("Không thể tạo chi nhánh");

            sendSuccess(
                res,
                branch,
                "Tạo chi nhánh thành công",
                201,
            );
        } catch (error) {
            next(error);
        }
    };

    updateBranch = async (
        req: Request,
        res: Response,
        next: NextFunction,
    ) => {
        try {
            const updated = await this.branchService.updateBranch(
                req.params.id,
                req.body,
            );

            sendSuccess(
                res,
                updated,
                "Cập nhật chi nhánh thành công",
            );
        } catch (error) {
            next(error);
        }
    }

    deleteBranch = async (
        req: Request,
        res: Response,
        next: NextFunction,
    ) => {
        try {
            const result = await this.branchService.deleteBranch(
                req.params.id,
            );

            sendSuccess(
                res,
                result,
                result.message,
            );
        } catch (error) {
            next(error);
        }
    }

    activateBranch = async (
        req: Request,
        res: Response,
        next: NextFunction,
    ) => {
        try {
            const result = await this.branchService.activateBranch(
                req.params.id,
            );

            sendSuccess(
                res,
                result,
                result.message,
            );
        } catch (error) {
            next(error);
        }
    }
}

export const branchController = new BranchController();