// promotion.controller.ts

import { Response, NextFunction } from 'express';
import { promotionService } from '../services/promotion.service';
import { sendSuccess, sendCreated, sendNoContent } from '../../../common/utils/apiResponse';
import { sendPaginated } from '../../../common/utils/paginated.helper';
import { AuthenticatedRequest } from '../../../common/types';
import {
    ICreatePromotion,
    IUpdatePromotion,
    IToggleActive,
    IGetPromotionList,
} from '../interfaces/promotion.interface';

export class PromotionController {
    private readonly promotionService = promotionService;

    // ─────────────────────────────────────────────
    // POST /promotions
    // ─────────────────────────────────────────────
    create = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            const result = await this.promotionService.createPromotion(
                req.user.id,
                req.body as ICreatePromotion,
            );
            sendCreated(res, result.promotion, 'Promotion created successfully');
        } catch (err) {
            next(err);
        }
    };

    // ─────────────────────────────────────────────
    // GET /promotions
    // ─────────────────────────────────────────────
    getList = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            const result = await this.promotionService.getPromotionList(
                req.query as unknown as IGetPromotionList,
            );
            sendPaginated(res, result, 'Promotions fetched successfully');
        } catch (err) {
            next(err);
        }
    };

    // ─────────────────────────────────────────────
    // GET /promotions/:id
    // ─────────────────────────────────────────────
    getById = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            const { promotion } = await this.promotionService.getPromotionById(req.params.id);
            sendSuccess(res, promotion, 'Promotion fetched successfully');
        } catch (err) {
            next(err);
        }
    };

    // ─────────────────────────────────────────────
    // PATCH /promotions/:id
    // ─────────────────────────────────────────────
    update = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            const { promotion } = await this.promotionService.updatePromotion(
                req.params.id,
                req.body as IUpdatePromotion,
            );
            sendSuccess(res, promotion, 'Promotion updated successfully');
        } catch (err) {
            next(err);
        }
    };

    // ─────────────────────────────────────────────
    // PATCH /promotions/:id/toggle-active
    // ─────────────────────────────────────────────
    toggleActive = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            const { is_active } = req.body as IToggleActive;
            const { promotion } = await this.promotionService.toggleActive(req.params.id, { is_active });
            sendSuccess(
                res,
                promotion,
                `Promotion ${is_active ? 'activated' : 'deactivated'} successfully`,
            );
        } catch (err) {
            next(err);
        }
    };

    // ─────────────────────────────────────────────
    // DELETE /promotions/:id
    // ─────────────────────────────────────────────
    remove = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            await this.promotionService.deletePromotion(req.params.id);
            sendNoContent(res);
        } catch (err) {
            next(err);
        }
    };

    // ─────────────────────────────────────────────
    // GET /promotions/validate/:code  (public)
    // ─────────────────────────────────────────────
    validateCode = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            const { promotion } = await this.promotionService.validateCode(req.params.code);
            sendSuccess(res, promotion, 'Promotion code is valid');
        } catch (err) {
            next(err);
        }
    };
}

export const promotionController = new PromotionController();