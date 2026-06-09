import { FilterQuery, PaginateOptions, PaginateResult } from 'mongoose';
import { TierConfig, ITierConfig } from '../../../models/tierConfig.model';
import { BaseRepository } from '../../../common/repositories/base.repository';

export class TierRepository extends BaseRepository<ITierConfig> {
  constructor() {
    super(TierConfig);
  }

  findByName(name: string): Promise<ITierConfig | null> {
    return this.model.findOne({ tier_name: name }).exec();
  }

  paginateWithCreator(
    filter: FilterQuery<ITierConfig>,
    options: PaginateOptions,
  ): Promise<PaginateResult<ITierConfig>> {
    return this.paginate(filter, {
      ...options,
      populate: { path: 'admin_id', select: 'full_name email', model: 'User' },
      sort: { created_at: -1 },
    });
  }

  findTier(max_membership_points: number, min_membership_points: number): Promise<ITierConfig | null> {
    return this.model.findOne({ max_membership_points: { $gte: max_membership_points }, min_membership_points: { $lte: min_membership_points } }).exec();
  }
}

export const tierRepository = new TierRepository();

