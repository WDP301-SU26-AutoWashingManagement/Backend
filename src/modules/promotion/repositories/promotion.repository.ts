import { FilterQuery, PaginateOptions, PaginateResult } from 'mongoose';
import { Promotion, IPromotion } from '../../../models/promotion.model';
import { BaseRepository } from '../../../common/repositories/base.repository';

export class PromotionRepository extends BaseRepository<IPromotion> {
  constructor() {
    super(Promotion);
  }

  /**
   * Tìm promotion theo code (case-insensitive, vì schema đã uppercase)
   */
  findByCode(code: string): Promise<IPromotion | null> {
    return this.model
      .findOne({ promotion_code: code.toUpperCase().trim() })
      .exec();
  }

  /**
   * Tìm promotion còn hiệu lực tại thời điểm hiện tại
   */
  findActiveByCode(code: string): Promise<IPromotion | null> {
    const now = new Date();
    return this.model
      .findOne({
        promotion_code: code.toUpperCase().trim(),
        is_active: true,
        start_at: { $lte: now },
        end_at: { $gte: now },
      })
      .exec();
  }

  /**
   * Phân trang danh sách promotion với populate creator
   */
  paginateWithCreator(
    filter: FilterQuery<IPromotion>,
    options: PaginateOptions,
  ): Promise<PaginateResult<IPromotion>> {
    return this.paginate(filter, {
      ...options,
      populate: { path: 'created_by', select: 'full_name email avatar_url' },
      sort: { created_at: -1 },
    });
  }
}

export const promotionRepository = new PromotionRepository();