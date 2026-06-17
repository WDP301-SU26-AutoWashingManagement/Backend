
import { BaseRepository } from "@common/repositories/base.repository";
import { IPromotion, Promotion } from "../../../models/promotion.model";

export class PromotionRepository extends BaseRepository<IPromotion> {
    constructor() {
        super(Promotion);
    }
}

export const promotionRepository = new PromotionRepository();