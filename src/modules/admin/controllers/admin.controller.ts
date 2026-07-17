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
      
      if (req.user.role === UserRole.STAFF) {
        const { staffRepository } = require('../../staff-manager/repositories/staff.repository');
        const staff = await staffRepository.findByUserId(req.user.id);
        if (staff?.staff_type === 'technical') {
          const { ForbiddenError } = require('../../../common/utils/AppError');
          throw new ForbiddenError('Staff technical không có quyền xem thống kê doanh thu');
        }
      }

      return user?.branch_id ? user.branch_id.toString() : null;
    }

    if (req.user.role === UserRole.BOSS) {
       const requestedBranchId = req.query.branch_id || req.body.branch_id;
       if (requestedBranchId && typeof requestedBranchId === 'string' && requestedBranchId !== 'all') {
         return requestedBranchId;
       }
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
  // POST /admin/bookings/hourly-distribution
  // ─────────────────────────────────────────────
  getHourlyBookingDistribution = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const branchId = await this.getBranchId(req);
      const result = await adminService.getHourlyBookingDistribution(req.body, branchId);
      sendSuccess(res, result, 'Hourly booking distribution fetched successfully');
    } catch (err) {
      next(err);
    }
  };

  // ─────────────────────────────────────────────
  // POST /admin/paid-bookings
  // ─────────────────────────────────────────────
  getPaidBookings = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const branchId = await this.getBranchId(req);
      const result = await adminService.getPaidBookings(req.body, branchId);
      sendSuccess(res, result, 'Paid bookings fetched successfully');
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
      const { startDate, endDate } = req.query as { startDate?: string, endDate?: string };
      const result = await adminService.getTopServices(branchId, { startDate, endDate });
      sendSuccess(res, result, 'Top services fetched successfully');
    } catch (err) {
      next(err);
    }
  };

  // ─────────────────────────────────────────────
  // GET /admin/top-services-revenue
  // ─────────────────────────────────────────────
  getTopServicesByRevenue = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const branchId = await this.getBranchId(req);
      const { startDate, endDate } = req.query as { startDate?: string, endDate?: string };
      const result = await adminService.getTopServicesByRevenue(branchId, { startDate, endDate });
      sendSuccess(res, result, 'Top services by revenue fetched successfully');
    } catch (err) {
      next(err);
    }
  };

  // ─────────────────────────────────────────────
  // GET /admin/top-individual-services
  // ─────────────────────────────────────────────
  getTopIndividualServices = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const branchId = await this.getBranchId(req);
      const { startDate, endDate } = req.query as { startDate?: string, endDate?: string };
      const result = await adminService.getTopIndividualServices(branchId, { startDate, endDate });
      sendSuccess(res, result, 'Top individual services fetched successfully');
    } catch (err) {
      next(err);
    }
  };

  // ─────────────────────────────────────────────
  // GET /admin/top-individual-services-revenue
  // ─────────────────────────────────────────────
  getTopIndividualServicesByRevenue = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const branchId = await this.getBranchId(req);
      const { startDate, endDate } = req.query as { startDate?: string, endDate?: string };
      const result = await adminService.getTopIndividualServicesByRevenue(branchId, { startDate, endDate });
      sendSuccess(res, result, 'Top individual services by revenue fetched successfully');
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
          const { branch_id } = req.query;
          const admins = await this.adminService.getAdmins(branch_id as string);

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

  getAdminTrash = async (
      req: Request,
      res: Response,
      next: NextFunction,
  ) => {
      try {
          const branchId = req.query.branch_id as string | undefined;
          const admins = await this.adminService.getAdminTrash(branchId);
          sendSuccess(res, admins, "Lấy danh sách admin đã xóa thành công");
      } catch (error) {
          next(error);
      }
  };

  restoreAdmin = async (
      req: Request,
      res: Response,
      next: NextFunction,
  ) => {
      try {
          const result = await this.adminService.restoreAdmin(req.params.id);
          sendSuccess(res, result, result.message);
      } catch (error) {
          next(error);
      }
  };
}

export const adminController = new AdminController();