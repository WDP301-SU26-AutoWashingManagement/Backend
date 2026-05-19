import { Request, Response, NextFunction } from 'express';
import { PasswordService } from '../services/password.service'
import { sendSuccess } from '../../../common/utils/apiResponse';
import { AuthenticatedRequest } from '../../../common/types';

export class PasswordController {
  static async forgotPassword(req: Request, res: Response, next: NextFunction) {
    try {
      await PasswordService.forgotPassword(req.body);
      sendSuccess(res, null, 'Nếu email tồn tại, mã OTP đã được gửi.');
    } catch (error) { next(error); }
  }

static async verifyOtp(req: Request, res: Response, next: NextFunction) {
  try {
    await PasswordService.verifyOtp(req.body); // thêm await
    sendSuccess(res, null, 'OTP hợp lệ.');
  } catch (error) { next(error); }
}

  static async resetPassword(req: Request, res: Response, next: NextFunction) {
    try {
      await PasswordService.resetPassword(req.body);
      sendSuccess(res, null, 'Đặt lại mật khẩu thành công. Vui lòng đăng nhập lại.');
    } catch (error) { next(error); }
  }

  static async changePassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = (req as AuthenticatedRequest).user;
      await PasswordService.changePassword(id, req.body);
      sendSuccess(res, null, 'Đổi mật khẩu thành công.');
    } catch (error) { next(error); }
  }
}
