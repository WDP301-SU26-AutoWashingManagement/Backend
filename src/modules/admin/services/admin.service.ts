import { WashBooking } from 'src/models/washBooking.model';
import { Customer } from '../../../models/customer.model';
import { IBookingCount, IProfitQuery, IDailyProfit, ITopService } from '../interfaces/admin.interface';

class AdminService {
  /**
   * Get total number of customers.
   */
  async getCustomerCount(): Promise<{ totalCustomers: number }> {
    const totalCustomers = await Customer.countDocuments();
    return { totalCustomers };
  }

  async getBookingCount(date: IBookingCount): Promise<{ totalBookings: number }> {
    const start = new Date(date.startDate);
    const end = new Date(date.endDate);
    end.setHours(23, 59, 59, 999);
    const totalBookings = await WashBooking.countDocuments({
      booking_date: {
        $gte: start,
        $lte: end,
      }
    });
    return { totalBookings };
  }

  /**
   * Get daily profit (sum of final_price for completed bookings) between startDate and endDate.
   */
  async getDailyProfit(query: IProfitQuery): Promise<IDailyProfit[]> {
    const start = new Date(query.startDate);
    const end = new Date(query.endDate);
    // Set end to end-of-day so the entire endDate is included
    end.setHours(23, 59, 59, 999);

    // Aggregate completed bookings, group by day
    const results = await WashBooking.aggregate<{ _id: string; profit: number }>([
      {
        $match: {
          booking_status: 'completed',
          completed_at: { $gte: start, $lte: end },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$completed_at' } },
          profit: { $sum: '$final_price' },
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

    const results = await WashBooking.aggregate([
      {
        $match: {
          created_at: { $gte: thirtyDaysAgo, $lte: now },
          booking_status: { $ne: 'cancelled' },
        },
      },
      {
        $group: {
          _id: '$service_package_id',
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 3 },
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
          serviceName: '$package.service_name',
          count: 1,
        },
      },
    ]);

    return results;
  }
}

export const adminService = new AdminService();
