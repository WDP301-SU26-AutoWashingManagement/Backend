import { FilterQuery, PaginateResult } from 'mongoose';
import { IPromotion } from '../../../models/promotion.model';
import { promotionRepository } from '../repositories/promotion.repository';
import {
    CreatePromotionDto,
    UpdatePromotionDto,
    ToggleActiveDto,
    GetPromotionListDto,
} from '../dtos/promotion.dto';
import {
    ConflictError,
    NotFoundError,
    BadRequestError,
} from '../../../common/utils/AppError';

export type PromotionResponse = { promotion: IPromotion };

export class PromotionService {
    private readonly promotionRepo = promotionRepository;

    // ─────────────────────────────────────────────
    // POST /promotions
    // ─────────────────────────────────────────────
    async createPromotion(adminId: string, dto: CreatePromotionDto): Promise<PromotionResponse> {
        const exists = await this.promotionRepo.findByCode(dto.promotion_code);
        if (exists) {
            throw new ConflictError(
                `Promotion code "${dto.promotion_code.toUpperCase()}" already exists`,
            );
        }

        if (new Date(dto.end_at) <= new Date(dto.start_at)) {
            throw new BadRequestError('end_at must be after start_at');
        }

        const promotion = await this.promotionRepo.create({
            ...dto,
            start_at: new Date(dto.start_at),
            end_at:   new Date(dto.end_at),
            usage_limit: Number(dto.usage_limit) ?? null,
            promotion_code: dto.promotion_code.toUpperCase().trim(),
            created_by:     adminId as unknown as IPromotion['created_by'],
            used_count:     0,
        });

        return { promotion };
    }

    // ─────────────────────────────────────────────
    // GET /promotions
    // ─────────────────────────────────────────────
    async getPromotionList(dto: GetPromotionListDto): Promise<PaginateResult<IPromotion>> {
        const {
            page = 1,
            limit = 10,
            is_active,
            discount_type,
            search,
            start_from,
            start_to,
            end_from,
            end_to,
        } = dto;

        const filter: FilterQuery<IPromotion> = {};

        if (is_active !== undefined) filter.is_active    = is_active;
        if (discount_type)           filter.discount_type = discount_type;

        if (search) {
            filter.promotion_code = { $regex: search.toUpperCase(), $options: 'i' };
        }

        if (start_from || start_to) {
            filter.start_at = {};
            if (start_from) filter.start_at.$gte = new Date(start_from);
            if (start_to)   filter.start_at.$lte = new Date(start_to);
        }

        if (end_from || end_to) {
            filter.end_at = {};
            if (end_from) filter.end_at.$gte = new Date(end_from);
            if (end_to)   filter.end_at.$lte = new Date(end_to);
        }

        return this.promotionRepo.paginateWithCreator(filter, { page, limit });
    }

    // ─────────────────────────────────────────────
    // GET /promotions/:id
    // ─────────────────────────────────────────────
    async getPromotionById(id: string): Promise<PromotionResponse> {
        const promotion = await this.promotionRepo.findById(id);
        if (!promotion) throw new NotFoundError('Promotion not found');
        return { promotion };
    }

    // ─────────────────────────────────────────────
    // PATCH /promotions/:id
    // ─────────────────────────────────────────────
    async updatePromotion(id: string, dto: UpdatePromotionDto): Promise<PromotionResponse> {
        const promotion = await this.promotionRepo.findById(id);
        if (!promotion) throw new NotFoundError('Promotion not found');

        const effectiveStart = dto.start_at ? new Date(dto.start_at) : promotion.start_at;
        const effectiveEnd   = dto.end_at   ? new Date(dto.end_at)   : promotion.end_at;
        if (effectiveEnd <= effectiveStart) {
            throw new BadRequestError('end_at must be after start_at');
        }

        if (dto.discount_value !== undefined && promotion.used_count > 0) {
            throw new BadRequestError(
                'Cannot change discount_value after the promotion has been used',
            );
        }

        const updated = await this.promotionRepo.updateById(id, { $set: dto });
        if (!updated) throw new NotFoundError('Promotion not found');

        return { promotion: updated };
    }

    // ─────────────────────────────────────────────
    // PATCH /promotions/:id/toggle-active
    // ─────────────────────────────────────────────
    async toggleActive(id: string, dto: ToggleActiveDto): Promise<PromotionResponse> {
        const promotion = await this.promotionRepo.findById(id);
        if (!promotion) throw new NotFoundError('Promotion not found');

        const updated = await this.promotionRepo.updateById(id, {
            $set: { is_active: dto.is_active },
        });
        if (!updated) throw new NotFoundError('Promotion not found');

        return { promotion: updated };
    }

    // ─────────────────────────────────────────────
    // DELETE /promotions/:id
    // ─────────────────────────────────────────────
    async deletePromotion(id: string): Promise<void> {
        const promotion = await this.promotionRepo.findById(id);
        if (!promotion) throw new NotFoundError('Promotion not found');

        if (promotion.used_count > 0) {
            throw new BadRequestError(
                'Cannot delete a promotion that has already been used. Deactivate it instead.',
            );
        }

        await this.promotionRepo.deleteById(id);
    }

    // ─────────────────────────────────────────────
    // GET /promotions/validate/:code  (public)
    // ─────────────────────────────────────────────
    async validateCode(code: string): Promise<PromotionResponse> {
        const promotion = await this.promotionRepo.findActiveByCode(code);
        if (!promotion) {
            throw new NotFoundError('Promotion code is invalid or has expired');
        }

        if (!promotion.isValid()) {
            throw new BadRequestError('Promotion code has reached its usage limit');
        }

        return { promotion };
    }
}

export const promotionService = new PromotionService();
