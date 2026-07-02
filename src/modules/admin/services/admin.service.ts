import { Appointment } from '../../../models/appointment.model';
import { Customer } from '../../../models/customer.model';
import { Invoice } from '../../../models/invoice.model';
import { AppointmentService } from '../../../models/appointmentService.model';
import { IBookingCount, IProfitQuery, IDailyProfit, ITopService, ITopServiceRevenue, ITopIndividualService, ITopIndividualServiceRevenue, IAdminUpdate, IHourlyBooking } from '../interfaces/admin.interface';
import { Types } from 'mongoose';
import { adminRepository } from '../repositories/admin.repository';
import { BadRequestError, NotFoundError } from '@common/utils/AppError';
import { User } from '../../../models/user.model';
import { Branch } from '../../../models/branch.model';

class AdminService {
  private readonly adminRepo = adminRepository;
  /**
   * Get total number of customers.
   */
  async getCustomerCount(branchId?: string | null): Promise<{ totalCustomers: number }> {
    let totalCustomers = 0;
    if (branchId) {
        // Find all unique customers who have an appointment at this branch
        const uniqueCustomers = await Appointment.distinct('customer_id', { branch_id: new Types.ObjectId(branchId) });
        totalCustomers = uniqueCustomers.length;
    } else {
        totalCustomers = await Customer.countDocuments();
    }
    return { totalCustomers };
  }

  /**
   * Get total bookings within startDate and endDate.
   */
  async getBookingCount(date: IBookingCount, branchId?: string | null): Promise<{ totalBookings: number }> {
    const start = new Date(date.startDate);
    const end = new Date(date.endDate);
    end.setHours(23, 59, 59, 999);
    
    const filter: any = {
      scheduled_at: {
        $gte: start,
        $lte: end,
      }
    };
    if (branchId) {
        filter.branch_id = new Types.ObjectId(branchId);
    }
    
    const totalBookings = await Appointment.countDocuments(filter);
    return { totalBookings };
  }

  /**
   * Get hourly booking distribution within startDate and endDate.
   */
  async getHourlyBookingDistribution(date: IBookingCount, branchId?: string | null): Promise<IHourlyBooking[]> {
    const start = new Date(date.startDate);
    const end = new Date(date.endDate);
    end.setHours(23, 59, 59, 999);
    
    const filter: any = {
      scheduled_at: {
        $gte: start,
        $lte: end,
      },
      booking_status: { $nin: ['cancelled'] }
    };

    let minTime = "06:00";
    let maxTime = "22:00";

    if (branchId) {
        filter.branch_id = new Types.ObjectId(branchId);
        const branch = await Branch.findById(branchId).lean();
        if (branch && branch.operating_time) {
           minTime = branch.operating_time.default_open || minTime;
           maxTime = branch.operating_time.default_close || maxTime;
        }
    } else {
        const branches = await Branch.find().lean();
        if (branches.length > 0) {
           let minMin = 24 * 60, maxMin = 0;
           for (const b of branches) {
              if (b.operating_time) {
                 const openStr = b.operating_time.default_open || "06:00";
                 const closeStr = b.operating_time.default_close || "22:00";
                 const oMins = parseInt(openStr.split(':')[0]) * 60 + parseInt(openStr.split(':')[1]);
                 const cMins = parseInt(closeStr.split(':')[0]) * 60 + parseInt(closeStr.split(':')[1]);
                 if (oMins < minMin) minMin = oMins;
                 if (cMins > maxMin) maxMin = cMins;
              }
           }
           if (minMin !== 24 * 60) minTime = `${Math.floor(minMin/60).toString().padStart(2, '0')}:${(minMin%60).toString().padStart(2, '0')}`;
           if (maxMin !== 0) maxTime = `${Math.floor(maxMin/60).toString().padStart(2, '0')}:${(maxMin%60).toString().padStart(2, '0')}`;
        }
    }
    
    const pipeline: any[] = [
      { $match: filter },
      {
        $group: {
          _id: {
            hour: { $hour: { date: "$scheduled_at", timezone: "+07:00" } },
            minute: { $minute: { date: "$scheduled_at", timezone: "+07:00" } }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { "_id.hour": 1, "_id.minute": 1 } }
    ];

    const results = await Appointment.aggregate(pipeline);
    const map = new Map<string, number>();
    for (const r of results) {
      const m = r._id.minute < 30 ? "00" : "30";
      const key = `${r._id.hour.toString().padStart(2, '0')}:${m}`;
      map.set(key, (map.get(key) || 0) + r.count);
    }

    const hourlyDist: IHourlyBooking[] = [];
    let curMins = parseInt(minTime.split(':')[0]) * 60 + parseInt(minTime.split(':')[1]);
    const endMins = parseInt(maxTime.split(':')[0]) * 60 + parseInt(maxTime.split(':')[1]);

    while (curMins < endMins) {
      const h = Math.floor(curMins / 60).toString().padStart(2, '0');
      const m = (curMins % 60).toString().padStart(2, '0');
      const key = `${h}:${m}`;
      hourlyDist.push({
        time: key,
        count: map.get(key) || 0
      });
      curMins += 30;
    }

    return hourlyDist;
  }

  /**
   * Get daily profit (sum of total for paid invoices) between startDate and endDate.
   */
  async getDailyProfit(query: IProfitQuery, branchId?: string | null): Promise<IDailyProfit[]> {
    const start = new Date(query.startDate);
    const end = new Date(query.endDate);
    // Set end to end-of-day so the entire endDate is included
    end.setHours(23, 59, 59, 999);

    // Build match filter for invoices
    const invoiceMatch: any = {
      invoice_status: 'paid',
      paid_at: { $gte: start, $lte: end },
    };

    // If branchId is provided, we must lookup the appointment and match its branch_id
    const pipeline: any[] = [
      { $match: invoiceMatch }
    ];

    if (branchId) {
      pipeline.push(
        {
          $lookup: {
            from: 'appointments',
            localField: 'appointment_id',
            foreignField: '_id',
            as: 'appointment'
          }
        },
        { $unwind: '$appointment' },
        {
          $match: {
            'appointment.branch_id': new Types.ObjectId(branchId)
          }
        }
      );
    }

    pipeline.push(
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$paid_at', timezone: '+07:00' } },
          profit: { $sum: '$total' },
        },
      },
      { $sort: { _id: 1 } }
    );

    // Aggregate paid invoices, group by day
    const results = await Invoice.aggregate<{ _id: string; profit: number }>(pipeline);

    // Build a lookup map from aggregation results
    const profitMap = new Map<string, number>();
    for (const r of results) {
      profitMap.set(r._id, r.profit);
    }

    // Fill every day in the range so the frontend gets a continuous series
    const dailyProfits: IDailyProfit[] = [];
    const cursor = new Date(start);
    while (cursor <= end) {
      const dateStr = cursor.toISOString().slice(0, 10); // YYYY-MM-DD
      dailyProfits.push({
        date: dateStr,
        profit: profitMap.get(dateStr) ?? 0,
      });
      cursor.setDate(cursor.getDate() + 1);
    }

    return dailyProfits;
  }

  /**
   * Get top 3 most selected service packages in the given date range.
   */
  async getTopServices(branchId?: string | null, dates?: { startDate?: string, endDate?: string }): Promise<ITopService[]> {
    let start = new Date();
    start.setDate(start.getDate() - 30);
    let end = new Date();
    
    if (dates?.startDate) start = new Date(dates.startDate);
    if (dates?.endDate) {
      end = new Date(dates.endDate);
      end.setHours(23, 59, 59, 999);
    }

    const appointmentMatch: any = {
      'appointment.scheduled_at': { $gte: start, $lte: end },
      'appointment.booking_status': 'completed',
    };

    if (branchId) {
      appointmentMatch['appointment.branch_id'] = new Types.ObjectId(branchId);
    }

    const results = await AppointmentService.aggregate([
      // Only care about services associated with a service package
      {
        $match: {
          service_package_id: { $ne: null },
        },
      },
      // Join with Appointment to check dates and booking status
      {
        $lookup: {
          from: 'appointments',
          localField: 'appointment_id',
          foreignField: '_id',
          as: 'appointment',
        },
      },
      { $unwind: '$appointment' },
      // Filter for appointments created in the last 30 days that are not cancelled
      {
        $match: appointmentMatch,
      },
      // Group by the service package
      {
        $group: {
          _id: {
            appointment_id: '$appointment_id',
            service_package_id: '$service_package_id'
          }
        }
      },
      {
        $group: {
          _id: '$_id.service_package_id',
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 5 },
      // Lookup package details
      {
        $lookup: {
          from: 'servicepackages',
          localField: '_id',
          foreignField: '_id',
          as: 'package',
        },
      },
      { $unwind: '$package' },
      {
        $project: {
          _id: 0,
          servicePackageId: '$_id',
          serviceName: '$package.package_name',
          count: 1,
        },
      },
    ]);

    return results as ITopService[];
  }

  /**
   * Get top 3 service packages that generate the most revenue in the given date range.
   */
  async getTopServicesByRevenue(branchId?: string | null, dates?: { startDate?: string, endDate?: string }): Promise<ITopServiceRevenue[]> {
    let start = new Date();
    start.setDate(start.getDate() - 30);
    let end = new Date();
    
    if (dates?.startDate) start = new Date(dates.startDate);
    if (dates?.endDate) {
      end = new Date(dates.endDate);
      end.setHours(23, 59, 59, 999);
    }

    const appointmentMatch: any = {
      'appointment.scheduled_at': { $gte: start, $lte: end },
      'appointment.booking_status': 'completed',
    };

    if (branchId) {
      appointmentMatch['appointment.branch_id'] = new Types.ObjectId(branchId);
    }

    const results = await AppointmentService.aggregate([
      // Only care about services associated with a service package
      {
        $match: {
          service_package_id: { $ne: null },
        },
      },
      // Join with Appointment to check dates and booking status
      {
        $lookup: {
          from: 'appointments',
          localField: 'appointment_id',
          foreignField: '_id',
          as: 'appointment',
        },
      },
      { $unwind: '$appointment' },
      // Filter for appointments created in the last 30 days that are not cancelled
      {
        $match: appointmentMatch,
      },
      // Group by the service package and sum price_snapshot
      {
        $group: {
          _id: '$service_package_id',
          revenue: { $sum: '$price_snapshot' },
        },
      },
      { $sort: { revenue: -1 } },
      { $limit: 5 },
      // Lookup package details
      {
        $lookup: {
          from: 'servicepackages',
          localField: '_id',
          foreignField: '_id',
          as: 'package',
        },
      },
      { $unwind: '$package' },
      {
        $project: {
          _id: 0,
          servicePackageId: '$_id',
          serviceName: '$package.package_name',
          revenue: 1,
        },
      },
    ]);

    return results as ITopServiceRevenue[];
  }

  /**
   * Get top 3 most selected INDIVIDUAL services (not in a package) in the given date range.
   */
  async getTopIndividualServices(branchId?: string | null, dates?: { startDate?: string, endDate?: string }): Promise<ITopIndividualService[]> {
    let start = new Date();
    start.setDate(start.getDate() - 30);
    let end = new Date();
    
    if (dates?.startDate) start = new Date(dates.startDate);
    if (dates?.endDate) {
      end = new Date(dates.endDate);
      end.setHours(23, 59, 59, 999);
    }

    const appointmentMatch: any = {
      'appointment.scheduled_at': { $gte: start, $lte: end },
      'appointment.booking_status': 'completed',
    };

    if (branchId) {
      appointmentMatch['appointment.branch_id'] = new Types.ObjectId(branchId);
    }

    const results = await AppointmentService.aggregate([
      {
        $match: {
          service_package_id: null,
        },
      },
      {
        $lookup: {
          from: 'appointments',
          localField: 'appointment_id',
          foreignField: '_id',
          as: 'appointment',
        },
      },
      { $unwind: '$appointment' },
      {
        $match: appointmentMatch,
      },
      {
        $group: {
          _id: '$service_id',
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: 'services',
          localField: '_id',
          foreignField: '_id',
          as: 'serviceDoc',
        },
      },
      { $unwind: '$serviceDoc' },
      {
        $project: {
          _id: 0,
          serviceId: '$_id',
          serviceName: '$serviceDoc.service_name',
          count: 1,
        },
      },
    ]);

    return results as ITopIndividualService[];
  }

  /**
   * Get top 3 individual services that generate the most revenue in the given date range.
   */
  async getTopIndividualServicesByRevenue(branchId?: string | null, dates?: { startDate?: string, endDate?: string }): Promise<ITopIndividualServiceRevenue[]> {
    let start = new Date();
    start.setDate(start.getDate() - 30);
    let end = new Date();
    
    if (dates?.startDate) start = new Date(dates.startDate);
    if (dates?.endDate) {
      end = new Date(dates.endDate);
      end.setHours(23, 59, 59, 999);
    }

    const appointmentMatch: any = {
      'appointment.scheduled_at': { $gte: start, $lte: end },
      'appointment.booking_status': 'completed',
    };

    if (branchId) {
      appointmentMatch['appointment.branch_id'] = new Types.ObjectId(branchId);
    }

    const results = await AppointmentService.aggregate([
      {
        $match: {
          service_package_id: null,
        },
      },
      {
        $lookup: {
          from: 'appointments',
          localField: 'appointment_id',
          foreignField: '_id',
          as: 'appointment',
        },
      },
      { $unwind: '$appointment' },
      {
        $match: appointmentMatch,
      },
      {
        $group: {
          _id: '$service_id',
          revenue: { $sum: '$price_snapshot' },
        },
      },
      { $sort: { revenue: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: 'services',
          localField: '_id',
          foreignField: '_id',
          as: 'serviceDoc',
        },
      },
      { $unwind: '$serviceDoc' },
      {
        $project: {
          _id: 0,
          serviceId: '$_id',
          serviceName: '$serviceDoc.service_name',
          revenue: 1,
        },
      },
    ]);

    return results as ITopIndividualServiceRevenue[];
  }

  async getAdmins(branchId?: string) {
      if (branchId) {
          const usersInBranch = await User.find({ branch_id: new Types.ObjectId(branchId) }).select('_id');
          const userIds = usersInBranch.map(u => u._id);
          
          const filter = {
              $or: [
                  { branch_id: new Types.ObjectId(branchId) },
                  { user_id: { $in: userIds } }
              ]
          };
          return this.adminRepo.findMany(filter);
      }
      return this.adminRepo.findMany();
  }

  async getAdmin(adminId: string) {
      const admin = await this.adminRepo.findById(adminId);
      if (!admin) throw new NotFoundError("Không tìm thấy admin");
      return admin;
  }

  async updateAdmin(adminId: string, data: IAdminUpdate) {
      const admin = await this.adminRepo.findById(adminId);
      if (!admin) throw new NotFoundError("Không tìm thấy admin");

      if (data.user_id) {
          const existing = await this.adminRepo.findByUserId(data.user_id);
          if (existing && existing._id.toString() !== adminId) {
              throw new BadRequestError("User này đã được gán cho admin khác");
          }
      }

      await this.adminRepo.updateById(adminId, data);
      return this.adminRepo.findById(adminId);
  }

  async deleteAdmin(adminId: string) {
      const admin = await this.adminRepo.findById(adminId);
      if (!admin) throw new NotFoundError("Không tìm thấy admin");

      await this.adminRepo.deleteById(adminId);

      return { message: "Xóa admin thành công" };
  }
}

export const adminService = new AdminService();
