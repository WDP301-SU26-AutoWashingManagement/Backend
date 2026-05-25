import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';
import { sendSuccess } from '../../../common/utils/apiResponse';

export class AuthController {
  static async register(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await AuthService.register(req.body);
      sendSuccess(res, data, 'Register successful', 201);
    } catch (error) {
      next(error);
    }
  }

  static async login(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await AuthService.login(req.body);
      sendSuccess(res, data, 'Login successful');
    } catch (error) {
      next(error);
    }
  }
  
  static async googleLogin(req: Request, res: Response, next: NextFunction) {
    try {
      const { idToken } = req.body;
      const data = await AuthService.googleLogin(idToken);
      sendSuccess(res, data, 'Google login successful');
    } catch (error) {
      next(error);
    }
  }

  static async googleCode(req: Request, res: Response, next: NextFunction) {
    try {
      const { code, redirectUri } = req.body;
      const data = await AuthService.googleLoginByCode(code, redirectUri);
      sendSuccess(res, data, 'Google login successful');
    } catch (error) {
      next(error);
    }
  }

  static async refreshToken(req: Request, res: Response, next: NextFunction) {
    try {
      const { refreshToken } = req.body;
      const data = await AuthService.refreshToken(refreshToken);
      sendSuccess(res, data, 'Token refreshed successfully');
    } catch (error) {
      next(error);
    }
  }
}