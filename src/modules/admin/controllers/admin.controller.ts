import { Response, NextFunction } from 'express';
import { adminService } from '../services/admin.service';
import { sendSuccess } from '../../../common/utils/apiResponse';
import { AuthenticatedRequest } from '../../../common/types';
import { IBookingCount, IProfitQuery } from '../interfaces/admin.interface';

export class AdminController {
  // ─────────────────────────────────────────────
  // GET /admin/customers/count
  // ─────────────────────────────────────────────
  getCustomerCount = async (_req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const result = await adminService.getCustomerCount();
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
      const result = await adminService.getBookingCount(req.body as IBookingCount);
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
      const result = await adminService.getDailyProfit(req.body as IProfitQuery);
      sendSuccess(res, result, 'Daily profit fetched successfully');
    } catch (err) {
      next(err);
    }
  };

  // ─────────────────────────────────────────────
  // GET /admin/top-services
  // ─────────────────────────────────────────────
  getTopServices = async (_req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const result = await adminService.getTopServices();
      sendSuccess(res, result, 'Top services fetched successfully');
    } catch (err) {
      next(err);
    }
  };
}

export const adminController = new AdminController();