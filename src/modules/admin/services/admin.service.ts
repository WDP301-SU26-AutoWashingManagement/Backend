import { Appointment } from '../../../models/appointment.model';
import { Customer } from '../../../models/customer.model';
import { Invoice } from '../../../models/invoice.model';
import { AppointmentService } from '../../../models/appointmentService.model';
import { IBookingCount, IProfitQuery, IDailyProfit, ITopService } from '../interfaces/admin.interface';

class AdminService {
  /**
   * Get total number of customers.
   */
  async getCustomerCount(): Promise<{ totalCustomers: number }> {
    const totalCustomers = await Customer.countDocuments();
    return { totalCustomers };
  }

  /**
   * Get total bookings within startDate and endDate.
   */
  async getBookingCount(date: IBookingCount): Promise<{ totalBookings: number }> {
    const start = new Date(date.startDate);
    const end = new Date(date.endDate);
    end.setHours(23, 59, 59, 999);
    const totalBookings = await Appointment.countDocuments({
      scheduled_at: {
        $gte: start,
        $lte: end,
      }
    });
    return { totalBookings };
  }

  /**
   * Get daily profit (sum of total for paid invoices) between startDate and endDate.
   */
  async getDailyProfit(query: IProfitQuery): Promise<IDailyProfit[]> {
    const start = new Date(query.startDate);
    const end = new Date(query.endDate);
    // Set end to end-of-day so the entire endDate is included
    end.setHours(23, 59, 59, 999);

    // Aggregate paid invoices, group by day
    const results = await Invoice.aggregate<{ _id: string; profit: number }>([
      {
        $match: {
          invoice_status: 'paid',
          paid_at: { $gte: start, $lte: end },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$paid_at', timezone: '+07:00' } },
          profit: { $sum: '$total' },
        },
      },
      { $sort: { _id: 1 } },
    ]);

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
   * Get top 3 most selected service packages in the last 30 days.
   */
  async getTopServices(): Promise<ITopService[]> {
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

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
        $match: {
          'appointment.createdAt': { $gte: thirtyDaysAgo, $lte: now },
          'appointment.booking_status': { $ne: 'cancelled' },
        },
      },
      // Group by the service package
      {
        $group: {
          _id: '$service_package_id',
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 3 },
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
}

export const adminService = new AdminService();
