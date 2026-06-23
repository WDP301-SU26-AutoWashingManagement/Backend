import { Response, NextFunction } from 'express';
import { recommendationService } from '../services/recommendation.service';
import { sendSuccess } from '../../../common/utils/apiResponse';
import { AuthenticatedRequest } from '../../../common/types';
import { IGetBookingRecommendation } from '../interfaces/recommendation.interface';

class RecommendationController {
  getBookingRecommendation = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const result = await recommendationService.getBookingRecommendation(
        req.user.id,
        req.query as unknown as IGetBookingRecommendation,
      );
      sendSuccess(res, result, 'Booking recommendation generated successfully');
    } catch (err) {
      next(err);
    }
  };
}

export const recommendationController = new RecommendationController();
