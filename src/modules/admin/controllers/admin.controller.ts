import {Request, Response, NextFunction } from 'express';
import { adminService } from '../services/admin.service';
import { sendSuccess } from '../../../common/utils/apiResponse';
import { AuthenticatedRequest } from '../../../common/types';
import { IBookingCount, IProfitQuery } from '../interfaces/admin.interface';
import { UserRole } from '../../../common/types/enum';
import { Types } from 'mongoose';

export class AdminController {
  private readonly adminService = adminService;
  private async getBranchId(req: AuthenticatedRequest): Promise<string | null> {
    if (req.user.role === UserRole.STAFF || req.user.role === UserRole.ADMIN) {
      const { User } = require('../../../models/user.model');
      const user = await User.findById(req.user.id);
      return user?.branch_id ? user.branch_id.toString() : null;
    }
    return null;
  }

  // ─────────────────────────────────────────────
  // GET /admin/customers/count
  // ─────────────────────────────────────────────
  getCustomerCount = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const branchId = await this.getBranchId(req);
      const result = await adminService.getCustomerCount(branchId);
      sendSuccess(res, result, 'Customer count fetched successfully');
    } catch (err) {
      next(err);
    }
  };

  // ─────────────────────────────────────────────
  // POST /admin/bookings/count
  // Require body startDate and endDate
  // ─────────────────────────────────────────────
  getBookingCount = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const branchId = await this.getBranchId(req);
      const result = await adminService.getBookingCount(req.body as IBookingCount, branchId);
      sendSuccess(res, result, 'Booking count fetched successfully');
    } catch (err) {
      next(err);
    }
  };

  // ─────────────────────────────────────────────
  // POST /admin/profit
  // Require body startDate and endDate
  // ─────────────────────────────────────────────
  getDailyProfit = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const branchId = await this.getBranchId(req);
      const result = await adminService.getDailyProfit(req.body as IProfitQuery, branchId);
      sendSuccess(res, result, 'Daily profit fetched successfully');
    } catch (err) {
      next(err);
    }
  };

  // ─────────────────────────────────────────────
  // GET /admin/top-services
  // ─────────────────────────────────────────────
  getTopServices = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const branchId = await this.getBranchId(req);
      const result = await adminService.getTopServices(branchId);
      sendSuccess(res, result, 'Top services fetched successfully');
    } catch (err) {
      next(err);
    }
  };

  getAdmins = async (
      req: Request,
      res: Response,
      next: NextFunction,
  ) => {
      try {
          const admins = await this.adminService.getAdmins();

          sendSuccess(
              res,
              admins,
              "Lấy danh sách admin thành công",
          );
      } catch (error) {
          next(error);
      }
  };

  getAdmin = async (
      req: Request,
      res: Response,
      next: NextFunction,
  ) => {
      try {
          const admin = await this.adminService.getAdmin(
              req.params.id,
          );

          sendSuccess(
              res,
              admin,
              "Lấy thông tin admin thành công",
          );
      } catch (error) {
          next(error);
      }
  };

  updateAdmin = async (
      req: Request,
      res: Response,
      next: NextFunction,
  ) => {
      try {
          const updated = await this.adminService.updateAdmin(
              req.params.id,
              req.body,
          );

          sendSuccess(
              res,
              updated,
              "Cập nhật admin thành công",
          );
      } catch (error) {
          next(error);
      }
  };

  deleteAdmin = async (
      req: Request,
      res: Response,
      next: NextFunction,
  ) => {
      try {
          const result = await this.adminService.deleteAdmin(
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
  };
}

export const adminController = new AdminController();