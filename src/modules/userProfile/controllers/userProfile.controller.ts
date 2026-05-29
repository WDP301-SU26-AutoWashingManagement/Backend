import { Request, Response, NextFunction } from 'express';
import { userProfileService }              from '../services/userProfile.service';
import { sendSuccess }                     from '../../../common/utils/apiResponse';
import { AuthenticatedRequest }            from '../../../common/types/index';
import { UserRole }                        from '../../../common/types/enum';

export class UserProfileController {
  private readonly profileService = userProfileService;
  async getProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const userId  = (req as AuthenticatedRequest).user.id;
      const profile = await this.profileService.getProfile(userId);
      sendSuccess(res, profile, 'Hồ sơ đã được lấy thành công');
    } catch (error) {
      next(error);
    }
  }

  async updateProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const id = (req as AuthenticatedRequest).user.id;
      const data = { ...req.body, file: (req as any).file};
      const updated = await this.profileService.updateProfile(id, data);
      sendSuccess(res, updated, 'Hồ sơ đã được cập nhật thành công');
    } catch (error) {
      next(error);
    }
  }

  async changePassword(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as AuthenticatedRequest).user.id;
      const result = await this.profileService.changePassword(userId, req.body);
      sendSuccess(res, result, result.message);
    } catch (error) {
      next(error);
    }
  }
}

export const userProfileController = new UserProfileController();
