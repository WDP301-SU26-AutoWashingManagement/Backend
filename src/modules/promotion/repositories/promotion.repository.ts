import { BaseRepository } from "@common/repositories/base.repository";
import { IPromotion, Promotion } from "src/models/promotion.model";

export class PromotionRepository extends BaseRepository<IPromotion> {
    constructor() {
        super(Promotion);
    }
    
}