import { Response, NextFunction } from 'express';
import { tierService } from '../services/tier.service';
import { sendCreated, sendSuccess, sendNoContent } from '../../../common/utils/apiResponse';
import { sendPaginated as sendPaginatedHelper } from '../../../common/utils/paginated.helper';
import { AuthenticatedRequest } from '../../../common/types';
import { ICreateTier, IGetTierList, IUpdateTier } from '../interfaces/tier.interface';

export class TierController {
  private readonly tierService = tierService;

  create = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const result = await this.tierService.createTier(req.user.id, req.body as ICreateTier);
      sendCreated(res, result.tier, 'Tier created successfully');
    } catch (err) {
      next(err);
    }
  };

  getList = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const result = await this.tierService.getTierList(req.query as unknown as IGetTierList);
      sendPaginatedHelper(res, result, 'Tiers fetched successfully');
    } catch (err) {
      next(err);
    }
  };

  getById = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { tier } = await this.tierService.getTierById(req.params.id);
      sendSuccess(res, tier, 'Tier fetched successfully');
    } catch (err) {
      next(err);
    }
  };

  update = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { tier } = await this.tierService.updateTier(req.params.id, req.body as IUpdateTier);
      sendSuccess(res, tier, 'Tier updated successfully');
    } catch (err) {
      next(err);
    }
  };

  remove = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      await this.tierService.deleteTier(req.params.id);
      sendNoContent(res);
    } catch (err) {
      next(err);
    }
  };
}

export const tierController = new TierController();

