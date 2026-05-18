import bcrypt from 'bcryptjs';
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
import Customer from '../../../models/customer.model';

const OTP_TYPE = 'forgot_password';

const otpEmailHtml = (otp: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; background: #f4f4f4; margin: 0; padding: 0; }
    .container { max-width: 480px; margin: 40px auto; background: #fff; border-radius: 10px; padding: 32px; box-shadow: 0 2px 12px rgba(0,0,0,0.08); }
    .logo { text-align: center; margin-bottom: 24px; }
    .logo span { font-size: 24px; font-weight: bold; color: #2563eb; }
    h2 { color: #1e293b; text-align: center; }
    p { color: #475569; line-height: 1.6; }
    .otp-box { background: #eff6ff; border: 2px dashed #2563eb; border-radius: 8px; text-align: center; padding: 20px; margin: 24px 0; }
    .otp-code { font-size: 36px; font-weight: bold; color: #2563eb; letter-spacing: 8px; }
    .footer { margin-top: 24px; border-top: 1px solid #e2e8f0; padding-top: 16px; color: #94a3b8; font-size: 12px; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo"><span>🚗 AutoWash</span></div>
    <h2>Đặt lại mật khẩu</h2>
    <p>Nhập mã OTP dưới đây để đặt lại mật khẩu của bạn:</p>
    <div class="otp-box">
      <div class="otp-code">${otp}</div>
    </div>
    <p style="color:#94a3b8; font-size:13px; text-align:center;">⏱ Mã có hiệu lực trong <strong>5 phút</strong></p>
    <p>Nếu bạn không yêu cầu, hãy bỏ qua email này.</p>
    <div class="footer">&copy; ${new Date().getFullYear()} AutoWash</div>
  </div>
</body>
</html>
`;

export class PasswordService {
  static async forgotPassword({ email }: IForgotPasswordData): Promise<void> {
    const customer = await authRepository.findOne({ email });
    // Không tiết lộ email có tồn tại hay không
    if (!customer) return;

    if (customer.registration_channel === 'google') {
      throw new AppError('Tài khoản đăng nhập qua Google không có mật khẩu để đặt lại.', 400);
    }

    const otp = await passwordRepository.createOtp(email, OTP_TYPE, 5);
    await sendEmail(email, 'Mã OTP đặt lại mật khẩu - AutoWash', otpEmailHtml(otp));
  }

  static async verifyOtp({ email, otp }: IVerifyOtpData): Promise<void> {
    const valid = await passwordRepository.findValidOtp(email, otp, OTP_TYPE);
    if (!valid) throw new AppError('Mã OTP không hợp lệ hoặc đã hết hạn.', 400);
    // Không mark used — để bước reset dùng lại
  }

  static async resetPassword({ email, otp, new_password }: IResetPasswordData): Promise<void> {
    const valid = await passwordRepository.findValidOtp(email, otp, OTP_TYPE);
    if (!valid) throw new AppError('Mã OTP không hợp lệ hoặc đã hết hạn.', 400);

    const customer = await Customer.findOne({ email }).select('+password');
    if (!customer) throw new AppError('Tài khoản không tồn tại.', 404);

    customer.password = new_password;
    await customer.save(); // pre('save') tự hash

    await passwordRepository.deleteOtp(email, OTP_TYPE);
  }

  static async changePassword(
    userId: string,
    { current_password, new_password }: IChangePasswordData,
  ): Promise<void> {
    const customer = await Customer.findById(userId).select('+password');
    if (!customer) throw new AppError('Tài khoản không tồn tại.', 404);

    if (customer.registration_channel === 'google') {
      throw new AppError('Tài khoản đăng nhập qua Google không hỗ trợ đổi mật khẩu.', 400);
    }

    const isMatch = await customer.comparePassword(current_password);
    if (!isMatch) throw new AppError('Mật khẩu hiện tại không đúng.', 401);

    customer.password = new_password;
    await customer.save();
  }
}
