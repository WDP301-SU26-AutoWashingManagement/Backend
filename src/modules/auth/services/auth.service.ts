import { OAuth2Client } from 'google-auth-library';
import { authRepository, adminRepository } from '../repositories/auth.repository';
import { IRegisterData, ILoginData, IAuthResponse } from '../interfaces/auth.interface';
import { AppError, ForbiddenError } from '../../../common/utils/AppError';
import { generateTokenPair, verifyRefreshToken } from '../../../common/utils/jwt.util';
import { env } from '../../../configs/env.config';

const client = new OAuth2Client(env.GOOGLE_CLIENT_ID);

// For server-side code exchange we need client with secret
const serverOAuth2Client = new OAuth2Client(env.GOOGLE_CLIENT_ID, env.GOOGLE_CLIENT_SECRET);

export class AuthService {
  static async register(data: IRegisterData): Promise<IAuthResponse> {
    const existingCustomer = await authRepository.findOne({ email: data.email });
    if (existingCustomer) {
      throw new AppError('Email is already registered', 400);
    }
    
    data.registration_channel = 'app';
    const customer = await authRepository.create(data);
    
    const tokens = generateTokenPair(customer.id as string, 'customer');
    return { user: this.sanitizeUser(customer), tokens };
  }

  static async login(data: ILoginData): Promise<IAuthResponse> {
    const { email, password, type = 'customer' } = data; //destructure type

    //Chọn repository và role dựa vào type
    const repo = type === 'admin' ? adminRepository : authRepository;
    const role = type === 'admin' ? 'admin' : 'customer';

    const user = await repo.findByEmailWithPassword(email);
    if (!user) {
      throw new AppError('Invalid email or password', 401);
    }

    const isMatch = await user.comparePassword(password!);
    if (!isMatch) {
      throw new AppError('Invalid email or password', 401);
    }

    if ('is_active' in user && !user.is_active) {
      throw new ForbiddenError('Account is inactive');
    }

    user.last_login_at = new Date();
    await user.save();

    const tokens = generateTokenPair(user.id as string, role);
    return { user: this.sanitizeUser(user), tokens };
  }

  static async googleLogin(idToken: string): Promise<IAuthResponse> {
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

    let customer = await authRepository.findOne({ email: payload.email });
    if (customer && customer.registration_channel === 'app') {
      throw new AppError('Email already registered with password. Please login normally.', 400);
    }
    
    if (!customer) {
      customer = await authRepository.create({
        email: payload.email,
        full_name: payload.name || 'Google User',
        avatar_url: payload.picture,
        registration_channel: 'google',
        password: Math.random().toString(36).slice(-10), // Random placeholder password
        is_email_verified: payload.email_verified || false,
      });
    }

    customer.last_login_at = new Date();
    await customer.save();

    const tokens = generateTokenPair(customer.id as string, 'customer');
    return { user: this.sanitizeUser(customer), tokens };
  }

  static async googleLoginByCode(code: string, redirectUri?: string): Promise<IAuthResponse> {
    const res = await serverOAuth2Client.getToken({ code, redirect_uri: redirectUri });
    const tokens = res.tokens;
    const idToken = tokens.id_token;
    if (!idToken) throw new AppError('Failed to retrieve id_token from Google', 400);
    return this.googleLogin(idToken);
  }

  private static sanitizeUser(user: any) {
    const obj = user.toObject();
    delete obj.password;
    return obj;
  }

  static async refreshToken(token: string) {
    const payload = verifyRefreshToken(token); 
    const tokens = generateTokenPair(payload.id, payload.role);
    return { tokens };
  }
}