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
      populate: { path: 'admin_id', select: 'full_name email', model: 'User' },
      sort: { created_at: -1 },
    });
  }
}

export const tierRepository = new TierRepository();

