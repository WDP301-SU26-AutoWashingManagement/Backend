import { FilterQuery, PaginateOptions, PaginateResult } from 'mongoose';
import { TierConfig, ITierConfig } from '../../../models/tierConfig.model';
import { BaseRepository } from '../../../common/repositories/base.repository';

export class TierRepository extends BaseRepository<ITierConfig> {
  constructor() {
    super(TierConfig);
  }

  findByName(name: string): Promise<ITierConfig | null> {
    return this.model.findOne({ tier_name: name.trim() }).exec();
  }

  paginateWithCreator(
    filter: FilterQuery<ITierConfig>,
    options: PaginateOptions,
  ): Promise<PaginateResult<ITierConfig>> {
    return this.paginate(filter, {
      ...options,
      populate: { path: 'admin_id', select: 'full_name email' },
      sort: { created_at: -1 },
    });
  }

  findNextTier(min_membership_points: number): Promise<ITierConfig | null> {
    return this.model.findOne({ min_membership_points: { $gt: min_membership_points } }).sort({ min_membership_points: 1 }).exec();
  } 

  findPrevTier(min_membership_points: number): Promise<ITierConfig | null> {
    return this.model.findOne({ min_membership_points: { $lt: min_membership_points } }).sort({ min_membership_points: -1 }).exec();
  }   
}

export const tierRepository = new TierRepository();

