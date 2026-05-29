import { authRepository } from '../repositories/auth.repository';
import { passwordRepository } from '../repositories/password.repository';
import { sendEmail } from '../../../common/utils/email.util';
import { AppError } from '../../../common/utils/AppError';
import {
  IForgotPasswordData,
  IVerifyOtpData,
  IResetPasswordData,
  IChangePasswordData,
} from '../interfaces/password.interface';
import { User } from '../../../models/user.model';
import { EMAIL_TEMPLATE } from '@common/constants/emailTemplate';

const OTP_TYPE = 'forgot_password';

export class PasswordService {
  private readonly authRepo = authRepository;

  async forgotPassword({ email }: IForgotPasswordData): Promise<void> {
    const customer = await authRepository.findOne({ email });
    if (!customer) return;

    const otp = await passwordRepository.createOtp(email, OTP_TYPE, 5);
    await sendEmail(email, 'Mã OTP đặt lại mật khẩu - AutoWash', EMAIL_TEMPLATE.FORGOT_PASSWORD(otp));
  }

  async verifyOtp({ email, otp }: IVerifyOtpData): Promise<void> {
    const valid = await passwordRepository.findValidOtp(email, otp, OTP_TYPE);
    if (!valid) throw new AppError('Mã OTP không hợp lệ hoặc đã hết hạn.', 400);
  }

  async resetPassword({ email, otp, new_password }: IResetPasswordData): Promise<void> {
    const valid = await passwordRepository.findValidOtp(email, otp, OTP_TYPE);
    if (!valid) throw new AppError('Mã OTP không hợp lệ hoặc đã hết hạn.', 400);

    const customer = await this.authRepo.findByEmail(email);
    if (!customer) throw new AppError('Tài khoản không tồn tại.', 404);

    customer.password = new_password;
    await customer.save();

    await passwordRepository.deleteOtp(email, OTP_TYPE);
  }

  async changePassword(
    userId: string,
    { current_password, new_password }: IChangePasswordData,
  ): Promise<void> {
    const user = await this.authRepo.findByIdWithPassword(userId);
    if (!user) throw new AppError('Tài khoản không tồn tại.', 404);

    const isMatch = await user.comparePassword(current_password);
    if (!isMatch) throw new AppError('Mật khẩu hiện tại không đúng.', 401);

    user.password = new_password;
    await user.save();
  }
}

export const passwordService = new PasswordService()
