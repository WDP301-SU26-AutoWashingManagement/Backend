import { OAuth2Client } from 'google-auth-library';
import { authRepository } from '../repositories/auth.repository';
import { IRegisterData, ILoginData, IAuthResponse } from '../interfaces/auth.interface';
import { AppError } from '../../../common/utils/AppError';
import { generateTokenPair, verifyRefreshToken } from '../../../common/utils/jwt.util';
import { env } from '../../../configs/env.config';
import { UserRole } from '../../../common/types/enum';
import { Customer } from '../../../models/customer.model';
import { Staff } from '../../../models/staff.model';
import { Admin } from '../../../models/admin.model';
import { sendEmail } from '@common/utils/email.util';
import { EMAIL_TEMPLATE } from '@common/constants/emailTemplate';

const client = new OAuth2Client(env.GOOGLE_CLIENT_ID);

// For server-side code exchange we need client with secret
const serverOAuth2Client = new OAuth2Client(env.GOOGLE_CLIENT_ID, env.GOOGLE_CLIENT_SECRET);

export class AuthService {
  /**
   * Create role document based on user role
   */
  private readonly authRepo = authRepository;

  private static async createRoleDocument(userId: any, role: UserRole): Promise<void> {
    try {
      switch (role) {
        case UserRole.CUSTOMER:
          await Customer.create({
            user_id: userId,
          });
          break;
        case UserRole.STAFF:
          await Staff.create({
            user_id: userId,
            hour_per_week: 5,
            salary_coefficient: 1.0
          });
          break;
        case UserRole.ADMIN:
          await Admin.create({
            user_id: userId
          });
          break;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Failed to create ${role} role document for user ${userId}:`, errorMessage);
      throw new AppError(`Failed to create ${role} role document: ${errorMessage}`, 500);
    }
  }

  async register(data: IRegisterData): Promise<IAuthResponse> {
    const existingCustomer = await this.authRepo.findByEmail(data.email)
    if (existingCustomer) {
      throw new AppError('Tài khoản đã tồn tại. Vui lòng đăng nhập', 400);
    }

    // Remove registration_channel from user data (it belongs to Customer, not User)
    const user = await authRepository.create(data);

    // await this.createRoleDocument(user._id, data.role as UserRole);

    const tokens = generateTokenPair(user.id as string, user.role as UserRole);
    return { user: this.sanitizeUser(user), tokens };
  }

  async login(data: ILoginData): Promise<IAuthResponse> {
    const user = await this.authRepo.findByEmail(data.email);
    if (!user) {
      throw new AppError('Email hay Password không đúng', 401);
    }

    const isMatch = await user.comparePassword(data.password!);
    if (!isMatch) {
      throw new AppError('Email hay Password không đúng', 401);
    }

    user.last_login_at = new Date();
    await user.save();

    const tokens = generateTokenPair(user.id as string, user.role as UserRole);
    return { user: this.sanitizeUser(user), tokens };
  }

  async googleLogin(idToken: string): Promise<IAuthResponse> {
    const ticket = await client.verifyIdToken({
      idToken,
      audience: [
        env.GOOGLE_CLIENT_ID,
        env.GOOGLE_ANDROID_CLIENT_ID
      ]
    });
    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      throw new AppError('Invalid Google Token', 401);
    }

    let user = await authRepository.findOne({ email: payload.email });
    let randomPassword = Math.random().toString(36).slice(-10)
    if (!user) {
      user = await authRepository.create({
        email: payload.email,
        full_name: payload.name || 'Google User',
        avatar_url: payload.picture,
        password: randomPassword, // Random placeholder password
      });

      // Create role document for newly registered user
      // await this.createRoleDocument(user._id, user.role as UserRole);
      sendEmail(user.email, "SEND PASSWORD FOR REGISTERING IN AUTOWASH MANAGEMENT SYSTEM", EMAIL_TEMPLATE.GOOGLE_REGISTERED_PASSWORD(user.full_name, randomPassword)).catch(console.error);
    }

    user.last_login_at = new Date();
    await user.save();
    
    const tokens = generateTokenPair(user.id as string, user.role as UserRole);
    return { user: this.sanitizeUser(user), tokens };
  }

  async googleLoginByCode(code: string, redirectUri?: string): Promise<IAuthResponse> {
    const res = await serverOAuth2Client.getToken({ code, redirect_uri: redirectUri });
    const tokens = res.tokens;
    const idToken = tokens.id_token;
    if (!idToken) throw new AppError('Failed to retrieve id_token from Google', 400);
    return this.googleLogin(idToken);
  }

  private sanitizeUser(user: any) {
    const obj = user.toObject();
    delete obj.password;
    return obj;
  }

  async refreshToken(token: string) {
    const payload = verifyRefreshToken(token);
    const tokens = generateTokenPair(payload.id, payload.role);
    return { tokens };
  }
}

export const authService = new AuthService()