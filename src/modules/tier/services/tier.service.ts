import { FilterQuery, PaginateResult, Types } from 'mongoose';
import { ITierConfig } from '../../../models/tierConfig.model';
import { tierRepository } from '../repositories/tier.repository';
import { ICreateTier, IGetTierList, IUpdateTier, TierStatus } from '../interfaces/tier.interface';
import { ConflictError, NotFoundError } from '../../../common/utils/AppError';
import { ICustomer } from '../../../models/customer.model';
import { redisCacheService } from '../../redis/services/redis-cache.service';

export type TierResponse = { tier: ITierConfig };

export class TierService {
  private readonly tierRepo = tierRepository;

  async createTier(
    adminId: string,
    dto: ICreateTier
  ): Promise<TierResponse> {
    const exists = await this.tierRepo.findByName(dto.tier_name);

    if (exists) {
      throw new ConflictError('Tier name already exists');
    }

    const tier = await this.tierRepo.create({
      admin_id: new Types.ObjectId(adminId),
      tier_name: dto.tier_name,
      min_membership_points: dto.min_membership_points,
      max_membership_points: dto.max_membership_points,
      booking_window_days: dto.booking_window_days,
      discount_percentage: dto.discount_percentage,
      free_features: dto.free_features?.map(
        (id) => new Types.ObjectId(id)
      ) || [],
    });

    // [CACHE INVALIDATION] Đăng ký mới làm thay đổi danh sách tổng
    await redisCacheService.delete('tier:all');

    return { tier };
  }

  async getTierList(
    dto: IGetTierList
  ): Promise<PaginateResult<ITierConfig>> {
    const {
      page = 1,
      limit = 10,
      search,
      min_points_from,
      min_points_to,
      max_points_from,
      max_points_to,
    } = dto;

    const filter: FilterQuery<ITierConfig> = {};

    if (search) {
      filter.tier_name = {
        $regex: search,
        $options: 'i',
      };
    }

    if (min_points_from !== undefined || min_points_to !== undefined) {
      filter.min_membership_points = {
        ...(min_points_from !== undefined && { $gte: min_points_from }),
        ...(min_points_to !== undefined && { $lte: min_points_to }),
      };
    }

    if (max_points_from !== undefined || max_points_to !== undefined) {
      filter.max_membership_points = {
        ...(max_points_from !== undefined && { $gte: max_points_from }),
        ...(max_points_to !== undefined && { $lte: max_points_to }),
      };
    }

    return this.tierRepo.paginateWithCreator(filter, {
      page,
      limit,
    });
  }

  async getTierById(id: string): Promise<TierResponse> {
    const tier = await this.tierRepo.findById(id);

    if (!tier) {
      throw new NotFoundError('Tier not found');
    }

    return { tier };
  }

  async updateTier(
    id: string,
    dto: IUpdateTier
  ): Promise<TierResponse> {
    const tier = await this.tierRepo.findById(id);

    if (!tier) {
      throw new NotFoundError('Tier not found');
    }

    const oldTierName = tier.tier_name;

    if (dto.tier_name && dto.tier_name !== oldTierName) {
      const exists = await this.tierRepo.findByName(dto.tier_name);

      if (exists) {
        throw new ConflictError('Tier name already exists');
      }
    }

    // Thực hiện cập nhật lên Primary DB
    const updated = await this.tierRepo.updateTierConfig(id, { $set: dto });

    if (!updated) {
      throw new NotFoundError('Tier not found');
    }

    // [CACHE INVALIDATION] Dọn dẹp bộ nhớ đệm ngay khi cập nhật thành công
    await Promise.all([
      redisCacheService.delete(`tier:name:${oldTierName}`), // Xóa key tên cũ
      ...(dto.tier_name ? [redisCacheService.delete(`tier:name:${dto.tier_name}`)] : []), // Xóa key tên mới (nếu có đổi)
      redisCacheService.delete('tier:all') // Xóa danh sách tổng làm mới ngầm bằng Cron
    ]);

    return {
      tier: updated,
    };
  }

  async deleteTier(id: string): Promise<void> {
    const tier = await this.tierRepo.findById(id);

    if (!tier) {
      throw new NotFoundError('Tier not found');
    }

    await this.tierRepo.deleteById(id);

    // [CACHE INVALIDATION] Xóa các key liên quan đến hạng vừa bị xóa
    await Promise.all([
      redisCacheService.delete(`tier:name:${tier.tier_name}`),
      redisCacheService.delete('tier:all')
    ]);
  }

  async checkTierIfChange(customer: ICustomer): Promise<string> {
    const { tier } = await this.getTierById(customer.tier_id!.toString());

    if (customer.membership_points < tier.min_membership_points || customer.membership_points > tier.max_membership_points) {
      // Gọi qua phương thức đọc từ Replica và không bị nghẽn Cache Bloat
      const newTier = await this.tierRepo.findTierByPoints(customer.membership_points, customer.membership_points);
      if (!newTier) throw new NotFoundError('Tier not found');
      return newTier._id!.toString();
    }

    return TierStatus.SAME;
  }

  async checkTierIfChangeNewPoint(customer: ICustomer, point: number): Promise<string> {
    const { tier } = await this.getTierById(customer.tier_id!.toString());

    if (point < tier.min_membership_points || point > tier.max_membership_points) {
      // Gọi qua phương thức đọc từ Replica và không bị nghẽn Cache Bloat
      const newTier = await this.tierRepo.findTierByPoints(point, point);
      if (!newTier) throw new NotFoundError('Tier not found');
      return newTier._id!.toString();
    }

    return TierStatus.SAME;
  }
}

export const tierService = new TierService();