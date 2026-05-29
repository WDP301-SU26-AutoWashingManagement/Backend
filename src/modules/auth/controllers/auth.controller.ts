import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service';
import { sendSuccess } from '../../../common/utils/apiResponse';

export class AuthController {
  private readonly autService = authService;
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await this.autService.register(req.body);
      sendSuccess(res, data, 'Đăng ký thành công', 201);
    } catch (error) {
      next(error);
    }
  }

  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await this.autService.login(req.body);
      sendSuccess(res, data, 'Đăng nhập thành công');
    } catch (error) {
      next(error);
    }
  }
  
  async googleLogin(req: Request, res: Response, next: NextFunction) {
    try {
      const { idToken } = req.body;
      const data = await this.autService.googleLogin(idToken);
      sendSuccess(res, data, 'Đăng nhập Google thành công');
    } catch (error) {
      next(error);
    }
  }

  async googleCode(req: Request, res: Response, next: NextFunction) {
    try {
      const { code, redirectUri } = req.body;
      const data = await this.autService.googleLoginByCode(code, redirectUri);
      sendSuccess(res, data, 'Đăng nhập Google thành công');
    } catch (error) {
      next(error);
    }
  }

  async refreshToken(req: Request, res: Response, next: NextFunction) {
    try {
      const { refreshToken } = req.body;
      const data = await this.autService.refreshToken(refreshToken);
      sendSuccess(res, data, 'Quyền truy cập đã được làm mới');
    } catch (error) {
      next(error);
    }
  }
}

export const authController = new AuthController()