import { Response, NextFunction } from 'express';
import { promotionService } from "../services/promotion.service";
import { sendCreated, sendSuccess, sendNoContent } from '../../../common/utils/apiResponse';
import { sendPaginated as sendPaginatedHelper } from '../../../common/utils/paginated.helper';
import { AuthenticatedRequest } from '../../../common/types';
import { ICreatePromotion, IGetDiscount, IGetPromotionList, IUpdatePromotion } from '../interfaces/promotion.interface';

export class PromotionController {
    private readonly promotionService = promotionService;

    create = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            const promotion = await this.promotionService.createPromotion(req.user!.id, req.body as ICreatePromotion);
            sendCreated(res, promotion, 'Promotion created successfully');
        } catch (err) {
            next(err);
        }
    };

    getList = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            const result = await this.promotionService.getPromotionList(req.query as unknown as IGetPromotionList);
            sendPaginatedHelper(res, result, 'Promotions fetched successfully');
        } catch (err) {
            next(err);
        }
    };

    getById = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            const promotion = await this.promotionService.getPromotionById(req.params.id);
            sendSuccess(res, promotion, 'Promotion fetched successfully');
        } catch (err) {
            next(err);
        }
    };

    update = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            const promotion = await this.promotionService.updatePromotion(req.params.id, req.body as IUpdatePromotion);
            sendSuccess(res, promotion, 'Promotion updated successfully');
        } catch (err) {
            next(err);
        }
    };

    remove = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            await this.promotionService.deletePromotion(req.params.id);
            sendNoContent(res);
        } catch (err) {
            next(err);
        }
    };

    getDiscount = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            const promotion = await this.promotionService.getDiscount(req.body as IGetDiscount);
            sendSuccess(res, promotion, 'Discount fetched successfully');
        } catch (err) {
            next(err);
        }
    };
}

export const promotionController = new PromotionController();