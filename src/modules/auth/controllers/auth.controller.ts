import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service';
import { sendSuccess } from '../../../common/utils/apiResponse';

export class AuthController {
  private readonly authService = authService;
  register = async(req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await this.authService.register(req.body);
      sendSuccess(res, data, 'Đăng ký thành công', 201);
    } catch (error) {
      next(error);
    }
  }

  login = async (req: Request, res: Response, next: NextFunction) => {
    try {
      console.log(this)
      const data = await this.authService.login(req.body);
      sendSuccess(res, data, 'Đăng nhập thành công');
    } catch (error) {
      next(error);
    }
  }
  
  googleLogin = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { idToken } = req.body;
      const data = await this.authService.googleLogin(idToken);
      sendSuccess(res, data, 'Đăng nhập Google thành công');
    } catch (error: any) {
      const isDuplicateReferralCode =
      error?.code === 11000 &&
      error?.keyPattern?.referral_code;

      if (isDuplicateReferralCode) {
        try {
          const { idToken } = req.body;

          const data = await this.authService.googleLogin(idToken);

          return sendSuccess(
            res,
            data,
            'Đăng nhập Google thành công'
          );
        } catch (retryError) {
          return next(retryError);
        }
      }
      next(error);
    }
  }

  googleCode = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { code, redirectUri } = req.body;
      const data = await this.authService.googleLoginByCode(code, redirectUri);
      sendSuccess(res, data, 'Đăng nhập Google thành công');
    } catch (error) {
      next(error);
    }
  }

  refreshToken = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { refreshToken } = req.body;
      const data = await this.authService.refreshToken(refreshToken);
      sendSuccess(res, data, 'Quyền truy cập đã được làm mới');
    } catch (error) {
      next(error);
    }
  }
}

export const authController = new AuthController()