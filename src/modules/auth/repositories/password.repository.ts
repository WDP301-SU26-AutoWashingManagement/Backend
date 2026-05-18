import crypto from 'crypto';
import { redisClient } from '../../../configs/redis.config';

const generateOtp = (): string => crypto.randomInt(100000, 999999).toString();

export class PasswordRepository {
  private key(email: string, type: string): string {
    return `otp:${type}:${email}`;
  }

  async createOtp(email: string, type: string, ttlMinutes = 5): Promise<string> {
    const otp = generateOtp();
    const key = this.key(email, type);
    // Lưu OTP vào Redis, tự động expire sau ttlMinutes
    await redisClient.set(key, otp, { EX: ttlMinutes * 60 });
    return otp;
  }

  async findValidOtp(email: string, otp: string, type: string): Promise<boolean> {
    const key = this.key(email, type);
    const stored = await redisClient.get(key);
    if (!stored) return false;
    return stored === otp;
  }

  async deleteOtp(email: string, type: string): Promise<void> {
    await redisClient.del(this.key(email, type));
  }
}

export const passwordRepository = new PasswordRepository();