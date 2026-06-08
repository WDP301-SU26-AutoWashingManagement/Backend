import { FilterQuery, PaginateResult } from 'mongoose';
import { ITierConfig, TierConfig } from '../../../models/tierConfig.model';
import { tierRepository } from '../repositories/tier.repository';
import { ICreateTier, IGetTierList, IUpdateTier, TierStatus } from '../interfaces/tier.interface';
import { ConflictError, NotFoundError } from '../../../common/utils/AppError';
import { ICustomer } from 'src/models/customer.model';
import { customerService } from '@modules/customer/services/customer.service';

export type TierResponse = { tier: ITierConfig };

export class TierService {
  private readonly tierRepo = tierRepository;
  private readonly customerService = customerService;

  async createTier(adminId: string, dto: ICreateTier): Promise<TierResponse> {
    const exists = await this.tierRepo.findByName(dto.tier_name);
    if (exists) throw new ConflictError('Tier name already exists');

    const tier = await this.tierRepo.create({
      ...dto,
      admin_id: adminId as unknown as ITierConfig['admin_id'],// ép kiểu admin từ paramenter từ string thành object
    } as Partial<ITierConfig>);                               // Do trong typescript không thể ép kiều từ String thành object_id đc nên phải có "As unknow"    
    return { tier };                        //Partial<ITierConfig>: cho phép không báo lỗi những field không thêm vào nhu create-at
  }

  async getTierList(dto: IGetTierList): Promise<PaginateResult<ITierConfig>> {
    const { page = 1, limit = 10, search, min_points_from, min_points_to } = dto;

    const filter: FilterQuery<ITierConfig> = {};
    if (search) filter.tier_name = { $regex: search, $options: 'i' } as any;
    if (min_points_from || min_points_to) {
      filter.min_membership_points = {} as any;
      if (min_points_from) (filter.min_membership_points as any).$gte = min_points_from;
      if (min_points_to) (filter.min_membership_points as any).$lte = min_points_to;
    }

    return this.tierRepo.paginateWithCreator(filter, { page, limit });
  }

  async getTierById(id: string): Promise<TierResponse> {
    const tier = await this.tierRepo.findById(id);
    if (!tier) throw new NotFoundError('Tier not found');
    return { tier };
  }

  async updateTier(id: string, dto: IUpdateTier): Promise<TierResponse> {
    const tier = await this.tierRepo.findById(id);
    if (!tier) throw new NotFoundError('Tier not found');

    if (dto.tier_name && dto.tier_name !== tier.tier_name) {
      const exists = await this.tierRepo.findByName(dto.tier_name);
      if (exists) throw new ConflictError('Tier name already exists');
    }

    const updated = await this.tierRepo.updateById(id, { $set: dto });
    if (!updated) throw new NotFoundError('Tier not found');
    return { tier: updated };
  }

  async deleteTier(id: string): Promise<void> {
    const tier = await this.tierRepo.findById(id);
    if (!tier) throw new NotFoundError('Tier not found');
    await this.tierRepo.deleteById(id);
  }

  async changeTier(customer: ICustomer, status: TierStatus) {
    const {tier} = await this.getTierById(customer.tier_id!.toString());
    if(status === TierStatus.UPGRADE) {
      const nextTier = await this.tierRepo.findNextTier(tier.min_membership_points);
      if (!nextTier) throw new Error('Tier not found');
      await this.customerService.updateTier(customer._id!.toString(), nextTier._id!.toString());
    } else if(status === TierStatus.DOWNGRADE) {
      const prevTier = await this.tierRepo.findPrevTier(tier.min_membership_points);  
      if (!prevTier) throw new Error('Tier not found');
      await this.customerService.updateTier(customer._id!.toString(), prevTier._id!.toString());
    }
  } 

  async checkTierIfChange(customer: ICustomer): Promise<string> {
    const { tier } = await this.getTierById(customer.tier_id!.toString());
    
    if(customer.membership_points < tier.min_membership_points) {
      return TierStatus.DOWNGRADE;
    }

    const nextTier = await this.tierRepo.findNextTier(tier.min_membership_points);
    
    if (!nextTier) return TierStatus.SAME;
    if (customer.membership_points >= nextTier.min_membership_points) {
      return TierStatus.UPGRADE;
    }

    return TierStatus.SAME;
  }
}

export const tierService = new TierService();

