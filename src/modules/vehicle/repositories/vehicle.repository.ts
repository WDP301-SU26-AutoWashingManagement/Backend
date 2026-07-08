import { Types } from 'mongoose';
import { BaseRepository } from '../../../common/repositories/base.repository';
import { Vehicle, IVehicle } from '../../../models/vehicle.model';
import { vehicleClassRepository } from './vehicleClass.repository';
import { CacheAside } from '../../redis/decorators/cache-aside.decorator';

// Định nghĩa interface cho kết quả trả về của lịch sử xe
export interface IHistoryEntry {
  scheduled_at: Date;
  branch_id: string | null;
  services: string[];
}

// Giả định enum BookingStatus của bạn nằm ở thư mục interfaces hoặc models
// Nếu bạn sử dụng string thuần, hãy thay đổi thành 'COMPLETED' trực tiếp trong câu query
import { BookingStatus } from '../../../models/appointment.model';

export class VehicleRepository extends BaseRepository<IVehicle> {
  constructor() {
    super(Vehicle);
  }

  // ─── READ METHODS (REPLICA) ─────────────────────────────────────────

  /**
   * N appointment gần nhất ĐÃ HOÀN THÀNH của 1 xe, kèm tên các service đã dùng.
   * Sử dụng Aggregation Pipeline gộp bảng ở tầng DB Replica để tối ưu hóa hiệu năng.
   */
  @CacheAside({
    keyPrefix: 'vehicle:history',
    ttl: 600, // Thơi gian sống của cache là 10 phút
    hydrate: false, // Kết quả là mảng Object tùy biến (POJO), không cần tạo lại Mongoose Document
    // CHỐNG TRÀN KEY (Cache Bloat): Chỉ dùng duy nhất vehicleId làm key, bỏ qua biến số limit
    keyBuilder: (vehicleId: string) => vehicleId
  })
  async findRecentHistory(vehicleId: string, limit = 5): Promise<IHistoryEntry[]> {
    // Để tối ưu cho Cache, ta luôn lấy và lưu sẵn tối đa 10 bản ghi gần nhất vào Redis.
    // Nếu các luồng khác gọi limit khác nhau (ví dụ: lấy 3 hoặc 5), hệ thống vẫn dùng chung 1 key cache này.
    const maxCacheLimit = Math.max(limit, 10);

    // Thực hiện truy vấn gộp qua Read Model (this.rm - Replica)
    // Chọc trực tiếp vào collection 'appointments' thông qua đối tượng Mongoose Connection ngầm
    const history = await this.rm.db.model('Appointment').aggregate([
      {
        $match: {
          vehicle_id: new Types.ObjectId(vehicleId),
          booking_status: BookingStatus.COMPLETED
        }
      },
      { $sort: { scheduled_at: -1 } },
      { $limit: maxCacheLimit },
      {
        $lookup: {
          from: 'appointmentservices',
          localField: '_id',
          foreignField: 'appointment_id',
          as: 'matched_services'
        }
      },
      {
        $lookup: {
          from: 'services',
          localField: 'matched_services.service_id',
          foreignField: '_id',
          as: 'service_details'
        }
      },
      {
        $project: {
          _id: 0,
          scheduled_at: 1,
          branch_id: { $toString: '$branch_id' },
          services: '$service_details.service_name'
        }
      }
    ]).exec();

    // Cắt (slice) mảng dữ liệu ngay tại đây để trả về đúng số lượng `limit` mà controller/service yêu cầu
    return (history as IHistoryEntry[]).slice(0, limit);
  }
}

export const vehicleRepository = new VehicleRepository();