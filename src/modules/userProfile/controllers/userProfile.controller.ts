import { Request, Response, NextFunction } from 'express';
import { UserProfileService }              from '../services/userProfile.service';
import { sendSuccess }                     from '../../../common/utils/apiResponse';
import { AuthenticatedRequest }            from '../../../common/types';
import { UserRole }                        from '@common/types';

export class UserProfileController {
  async getProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const userId  = (req as AuthenticatedRequest).user.id;
      const profile = await UserProfileService.getProfile(userId);
      sendSuccess(res, profile, 'Profile fetched successfully');
    } catch (error) {
      next(error);
    }
  }

  async updateProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const { id, role } = (req as AuthenticatedRequest).user;
      const updated = await UserProfileService.updateProfile(id, role as UserRole, req.body);
      sendSuccess(res, updated, 'Profile updated successfully');
    } catch (error) {
      next(error);
    }
  }

  async changePassword(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as AuthenticatedRequest).user.id;
      const result = await UserProfileService.changePassword(userId, req.body);
      sendSuccess(res, result, result.message);
    } catch (error) {
      next(error);
    }
  }
}

export const userProfileController = new UserProfileController();
