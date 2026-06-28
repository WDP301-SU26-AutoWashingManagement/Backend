import { FilterQuery, PaginateOptions, PaginateResult } from 'mongoose';
import { TierConfig, ITierConfig } from '../../../models/tierConfig.model';
import { BaseRepository } from '../../../common/repositories/base.repository';

export class TierRepository extends BaseRepository<ITierConfig> {
  constructor() {
    super(TierConfig);
  }

  // ─── READ (replica) ────────────────────────────────────────────────────────

  findByName(name: string): Promise<ITierConfig | null> {
    return this.rm.findOne({ tier_name: name }).exec();
  }

  findTier(max_membership_points: number, min_membership_points: number): Promise<ITierConfig | null> {
    return this.rm.findOne({
      max_membership_points: { $gte: max_membership_points },
      min_membership_points: { $lte: min_membership_points },
    }).exec();
  }

  paginateWithCreator(
    filter: FilterQuery<ITierConfig>,
    options: PaginateOptions,
  ): Promise<PaginateResult<ITierConfig>> {
    // paginate() trong BaseRepository dùng rm
    return this.paginate(filter, {
      ...options,
      populate: { path: 'admin_id', select: 'full_name email', model: 'User' },
      sort: { created_at: -1 },
    });
  }
}

export const tierRepository = new TierRepository();