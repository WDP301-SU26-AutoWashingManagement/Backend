import { Response, NextFunction } from 'express';
import { plainToInstance } from 'class-transformer';
import { PromotionService } from '../services/promotion.service';
import { sendSuccess, sendCreated, sendNoContent } from '../../../common/utils/apiResponse';
import { sendPaginated } from '../../../common/utils/paginated.helper';
import { AuthenticatedRequest } from '../../../common/types';
import {
    CreatePromotionDto,
    UpdatePromotionDto,
    ToggleActiveDto,
    GetPromotionListDto,
} from '../dtos/promotion.dto';

export class PromotionController {
    private promotionService = new PromotionService();

    // ─────────────────────────────────────────────
    // POST /promotions
    // ─────────────────────────────────────────────
    create = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            const dto    = plainToInstance(CreatePromotionDto, req.body);
            const result = await this.promotionService.createPromotion(req.user.id, dto);
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
            const dto    = plainToInstance(GetPromotionListDto, req.query);
            const result = await this.promotionService.getPromotionList(dto);
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
            const dto           = plainToInstance(UpdatePromotionDto, req.body);
            const { promotion } = await this.promotionService.updatePromotion(req.params.id, dto);
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
            const dto           = plainToInstance(ToggleActiveDto, req.body);
            const { promotion } = await this.promotionService.toggleActive(req.params.id, dto);
            sendSuccess(
                res,
                promotion,
                `Promotion ${dto.is_active ? 'activated' : 'deactivated'} successfully`,
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
