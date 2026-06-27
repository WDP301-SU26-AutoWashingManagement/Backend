import { OAuth2Client } from 'google-auth-library';
import { authRepository } from '../repositories/auth.repository';
import { IRegisterData, ILoginData, IAuthResponse } from '../interfaces/auth.interface';
import { AppError } from '../../../common/utils/AppError';
import { generateTokenPair, verifyRefreshToken } from '../../../common/utils/jwt.util';
import { env } from '../../../configs/env.config';
import { StaffRole, TierClass, UserRole } from '../../../common/types/enum';
import { Customer } from '../../../models/customer.model';
import { Staff } from '../../../models/staff.model';
import { Admin } from '../../../models/admin.model';
import { sendEmail } from '@common/utils/email.util';
import { EMAIL_TEMPLATE } from '@common/constants/emailTemplate';
import { Types } from 'mongoose';
import { TierConfig } from '../../../models/tierConfig.model';
import { generateCode } from '../../../models/counter.model';
import { generateReferralCode } from '../../../models/global/model.generate';
import crypto from 'crypto';

const client = new OAuth2Client(env.GOOGLE_CLIENT_ID);

// For server-side code exchange we need client with secret
const serverOAuth2Client = new OAuth2Client(env.GOOGLE_CLIENT_ID, env.GOOGLE_CLIENT_SECRET);

export class AuthService {
  /**
   * Create role document based on user role
   */
  private readonly authRepo = authRepository;

  private async createRoleDocument(user: any, owner: any = null) {
    if (user.role === UserRole.STAFF) {
      const isManager =
        owner && owner.role === UserRole.BOSS;

      await Staff.create({
        user_id: user._id,
        branch_id: user.branch_id,
        staff_type: isManager
          ? StaffRole.MANAGER
          : StaffRole.TECHNICAL,
        hire_date: new Date(),
        hour_per_week: isManager ? 60 : 40,
        salary_coefficient: isManager ? 2 : 1,
      });
    }

    if (user.role === UserRole.ADMIN) {
      await Admin.create({
        user_id: user._id,
        branch_id: user.branch_id,
      });
    }

    if (user.role === UserRole.CUSTOMER) {
      const tier = await TierConfig.findOne({
        tier_name: TierClass.MEMBER
      });

      if (!tier) {
        throw new AppError("Default tier not found", 500);
      }

      const referralCode = generateReferralCode();
      await Customer.create({
        user_id: user._id,
        created_at: new Date(),
        tier_id: tier._id,
        referral_code: referralCode,
        total_spent: 0,
        loyalty_points: 0,
      });
    }

  }

  async register(data: IRegisterData, userId: string): Promise<IAuthResponse> {
    const existingCustomer = await this.authRepo.findByEmail(data.email)
    if (existingCustomer) {
      throw new AppError('Tài khoản đã tồn tại. Vui lòng đăng nhập', 400);
    }

    if (data.role !== UserRole.STAFF && data.role !== UserRole.ADMIN) {
        throw new AppError('Chỉ được đăng ký tài khoản staff hoặc admin', 400);
    }
    const owner = await this.authRepo.findById(userId);
    if (!owner) {
      throw new AppError('Người dùng không tồn tại', 404);
    }

    const user = await authRepository.create({ ...data, branch_id: new Types.ObjectId(data.branch_id), user_code: await generateCode("user_code", "US", 6) });
    if (user.role === UserRole.ADMIN && owner.role !== UserRole.BOSS){
      throw new AppError('Chỉ Boss mới có quyền tạo tài khoản Admin', 403);
    }

    await this.createRoleDocument(user, owner);
    const tokens = generateTokenPair(user.id as string, user.role as UserRole);
    return { user: this.sanitizeUser(user), tokens };
  }

  async login(data: ILoginData): Promise<IAuthResponse> {
    const user = await this.authRepo.findByEmail(data.email);
    if (!user) {
      throw new AppError('Email hay Password không đúng', 401);
    }

    if (!data.password) {
      throw new Error('Password is required');
    }

    const isMatch = await user.comparePassword(data.password);
    console.log(isMatch)
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
    if (!payload?.email) {
      throw new AppError('Invalid Google Token', 401);
    }

    const email = payload.email.toLowerCase().trim();

    let user;
    const existingUser = await this.authRepo.findOne({ email });

    if (!existingUser) {
      const userCode = await generateCode("user_code", "US", 6);
      const randomPassword = crypto.randomBytes(16).toString("hex");

      user = await this.authRepo.create({
        email,
        full_name: payload.name || "Google User",
        avatar_url: payload.picture,
        password: randomPassword,
        role: UserRole.CUSTOMER,
        branch_id: null,
        user_code: userCode,
        last_login_at: new Date()
      });

      await this.createRoleDocument(user);

      await sendEmail(
        email,
        "Send password for google account",
        EMAIL_TEMPLATE.GOOGLE_REGISTERED_PASSWORD(
          user.full_name,
          randomPassword
        )
      );
    } else {
      await this.authRepo.updateById(existingUser._id.toString(), {
        full_name: payload.name || existingUser.full_name,
        avatar_url: payload.picture,
        last_login_at: new Date()
      });

      user = await this.authRepo.findById(existingUser._id.toString());
    }

    if (!user) {
      throw new AppError("User not found", 500);
    }
    const tokens = generateTokenPair(user._id.toString(), user.role);

    return {
      user: this.sanitizeUser(user),
      tokens
    };
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