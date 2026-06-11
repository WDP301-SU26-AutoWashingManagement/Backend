import { promotionRepository } from "../repositories/promotion.repository";
import { ICreatePromotion, IGetDiscount, IGetPromotionList, IResponseDiscount, IUpdatePromotion } from "../interfaces/promotion.interface";
import { Boss } from "../../../models/boss.model";
import { BadRequestError, ConflictError, NotFoundError } from "../../../common/utils/AppError";
import { FilterQuery, PaginateResult, Types } from "mongoose";
import { EPromotionType, IPromotion } from "../../../models/promotion.model";
import { Service } from "../../../models/service.model";

export class PromotionService {
    private readonly promotionRepository = promotionRepository; 

    async createPromotion(userId: string, dto: ICreatePromotion): Promise<IPromotion> {
        const boss = await Boss.findOne({ user_id: userId });
        if (!boss) {
            throw new NotFoundError('Boss profile not found for this user');
        }

        const codeUpper = dto.code.toUpperCase().trim();
        const existing = await this.promotionRepository.findOne({ code: codeUpper });
        if (existing) {
            throw new ConflictError('Promotion code already exists');
        }

        const serviceIds = dto.service_ids
            ? dto.service_ids.map(id => new Types.ObjectId(id))
            : [];

        // Check if all services exist in database
        if (serviceIds.length > 0) {
            const existingCount = await Service.countDocuments({ _id: { $in: serviceIds } });
            if (existingCount !== serviceIds.length) {
                throw new NotFoundError('One or more service_ids do not exist');
            }
        }

        // Validate type constraints
        if (dto.type === EPromotionType.BONUS_SERVICE) {
            if (serviceIds.length === 0) {
                throw new BadRequestError('Bonus service promotion must have at least one service_id');
            }
            dto.discount_percentage = 0;
            dto.discount_amount = 0;
        } else if (dto.type === EPromotionType.DISCOUNT) {
            if (serviceIds.length > 0) {
                throw new BadRequestError('Discount promotion cannot have service_ids');
            }
            if (!dto.discount_percentage && !dto.discount_amount) {
                throw new BadRequestError('Discount promotion must have either discount_percentage or discount_amount');
            }
        }

        const promotionData: Partial<IPromotion> = {
            promotion_name: dto.promotion_name,
            description: dto.description,
            code: codeUpper,
            type: dto.type,
            service_ids: serviceIds,
            discount_percentage: dto.type === EPromotionType.BONUS_SERVICE ? 0 : dto.discount_percentage,
            discount_amount: dto.type === EPromotionType.BONUS_SERVICE ? 0 : dto.discount_amount,
            min_order_amount: dto.min_order_amount,
            start_date: dto.start_date,
            end_date: dto.end_date,
            is_active: dto.is_active,
            boss_id: boss._id,
        };

        return this.promotionRepository.create(promotionData);
    }

    async getPromotionList(dto: IGetPromotionList): Promise<PaginateResult<IPromotion>> {
        const { page = 1, limit = 10, search, is_active, type } = dto;
        const filter: FilterQuery<IPromotion> = {};

        if (search) {
            filter.$or = [
                { promotion_name: { $regex: search, $options: 'i' } },
                { code: { $regex: search, $options: 'i' } },
            ];
        }

        if (is_active !== undefined) {
            filter.is_active = is_active;
        }

        if (type) {
            filter.type = type;
        }

        return this.promotionRepository.paginate(filter, {
            page,
            limit,
            sort: { createdAt: -1 }
        });
    }

    async getPromotionById(id: string): Promise<IPromotion> {
        const promotion = await this.promotionRepository.findById(id);
        if (!promotion) {
            throw new NotFoundError('Promotion not found');
        }
        return promotion;
    }

    async updatePromotion(id: string, dto: IUpdatePromotion): Promise<IPromotion> {
        const promotion = await this.promotionRepository.findById(id);
        if (!promotion) {
            throw new NotFoundError('Promotion not found');
        }

        if (dto.code) {
            const codeUpper = dto.code.toUpperCase().trim();
            if (codeUpper !== promotion.code) {
                const existing = await this.promotionRepository.findOne({
                    code: codeUpper,
                    _id: { $ne: promotion._id }
                });
                if (existing) {
                    throw new ConflictError('Promotion code already exists');
                }
            }
            dto.code = codeUpper;
        }

        const updateData: any = { ...dto };

        if (dto.service_ids !== undefined) {
            updateData.service_ids = dto.service_ids.map(id => new Types.ObjectId(id));
            if (updateData.service_ids.length > 0) {
                const existingCount = await Service.countDocuments({ _id: { $in: updateData.service_ids } });
                if (existingCount !== updateData.service_ids.length) {
                    throw new NotFoundError('One or more service_ids do not exist');
                }
            }
        }

        // Validate type constraints with merged data
        const merged = {
            type: dto.type !== undefined ? dto.type : promotion.type,
            service_ids: updateData.service_ids !== undefined ? updateData.service_ids : promotion.service_ids,
            discount_percentage: dto.discount_percentage !== undefined ? dto.discount_percentage : promotion.discount_percentage,
            discount_amount: dto.discount_amount !== undefined ? dto.discount_amount : promotion.discount_amount,
        };

        if (merged.type === EPromotionType.BONUS_SERVICE) {
            if (!merged.service_ids || merged.service_ids.length === 0) {
                throw new BadRequestError('Bonus service promotion must have at least one service_id');
            }
            updateData.discount_percentage = 0;
            updateData.discount_amount = 0;
        } else if (merged.type === EPromotionType.DISCOUNT) {
            if (merged.service_ids && merged.service_ids.length > 0) {
                throw new BadRequestError('Discount promotion cannot have service_ids');
            }
            if (!merged.discount_percentage && !merged.discount_amount) {
                throw new BadRequestError('Discount promotion must have either discount_percentage or discount_amount');
            }
            updateData.service_ids = [];
        }

        const updated = await this.promotionRepository.updateById(id, { $set: updateData });
        if (!updated) {
            throw new NotFoundError('Promotion not found');
        }
        return updated;
    }

    async deletePromotion(id: string): Promise<void> {
        const promotion = await this.promotionRepository.findById(id);
        if (!promotion) {
            throw new NotFoundError('Promotion not found');
        }
        await this.promotionRepository.deleteById(id);
    }

    async getDiscount (dto: IGetDiscount): Promise<IResponseDiscount> {
        const { code } = dto;
        const promotion = await this.promotionRepository.findOne({ code, is_active: true });
        if (!promotion) {
            throw new NotFoundError('Promotion not found');
        }
        return {
            id: promotion._id.toString(),
            promotion_name: promotion.promotion_name,
            description: promotion.description,
            code: promotion.code,
            type: promotion.type,
            service_ids: promotion.service_ids.map(id => id.toString()),
            discount_percentage: promotion.discount_percentage,
            discount_amount: promotion.discount_amount,
            min_order_amount: promotion.min_order_amount,
            start_date: promotion.start_date,
            end_date: promotion.end_date,
            is_active: promotion.is_active,
        };
    }
}

export const promotionService = new PromotionService();