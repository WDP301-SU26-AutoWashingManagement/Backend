import { Request, Response, NextFunction } from 'express';
import { passwordService } from '../services/password.service'
import { sendSuccess } from '../../../common/utils/apiResponse';
import { AuthenticatedRequest } from '../../../common/types';

export class PasswordController {
  private readonly passService = passwordService;

  forgotPassword = async(req: Request, res: Response, next: NextFunction) => {
    try {
      await this.passService.forgotPassword(req.body);
      sendSuccess(res, null, 'Mã OTP đã được gửi');
    } catch (error) { next(error); }
  }

  verifyOtp = async(req: Request, res: Response, next: NextFunction) => {
    try {
      await this.passService.verifyOtp(req.body);
      sendSuccess(res, null, 'OTP hợp lệ');
    } catch (error) { next(error); }
  }

  resetPassword = async(req: Request, res: Response, next: NextFunction) => {
    try {
      await this.passService.resetPassword(req.body);
      sendSuccess(res, null, 'Đặt lại mật khẩu thành công. Vui lòng đăng nhập lại');
    } catch (error) { next(error); }
  }
}

export const passwordController = new PasswordController()