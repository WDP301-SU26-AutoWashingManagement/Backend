import { FilterQuery, PaginateOptions, PaginateResult, UpdateQuery } from 'mongoose';
import { TierConfig, ITierConfig } from '../../../models/tierConfig.model';
import { BaseRepository } from '../../../common/repositories/base.repository';
import { CacheAside } from '../../redis/decorators/cache-aside.decorator';

export class TierRepository extends BaseRepository<ITierConfig> {
  constructor() {
    super(TierConfig); // Thường BaseRepository gán model chính vào `this.model`
  }

  // ─── READ METHODS (REPLICA) ─────────────────────────────────────────

  // Lấy toàn bộ danh sách phục vụ hàm Auto-Refresh
  async findAllFromReplica(): Promise<ITierConfig[]> {
    return this.rm.find({}).exec();
  }

  @CacheAside({
    keyPrefix: 'tier:name',
    ttl: 3600,
    hydrate: true
  })
  async findByName(name: string): Promise<ITierConfig | null> {
    return this.rm.findOne({ tier_name: name }).exec();
  }

  /**
   * Lưu ý: Không bọc @CacheAside ở đây nếu max/min point truyền vào liên tục thay đổi theo User.
   * Truy vấn thẳng từ Replica (this.rm) đã đạt hiệu năng cực kỳ tốt.
   */
  async findTierByPoints(maxPoints: number, minPoints: number): Promise<ITierConfig | null> {
    return this.rm.findOne({
      max_membership_points: { $gte: maxPoints },
      min_membership_points: { $lte: minPoints },
    }).exec();
  }

  async paginateWithCreator(
    filter: FilterQuery<ITierConfig>,
    options: PaginateOptions,
  ): Promise<PaginateResult<ITierConfig>> {
    return this.paginate(filter, {
      ...options,
      populate: { path: 'admin_id', select: 'full_name email', model: 'User' },
      sort: { created_at: -1 },
    });
  }

  // ─── WRITE METHODS (PRIMARY) ────────────────────────────────────────

  async updateTierConfig(id: string, updateData: UpdateQuery<ITierConfig>): Promise<ITierConfig | null> {
    return this.model.findByIdAndUpdate(id, updateData, { new: true }).exec();
  }
}

export const tierRepository = new TierRepository();