/**
 * env.config.ts  (Atlas edition)
 *
 * MONGODB_URI           — Atlas SRV string (1 duy nhất, bắt buộc)
 *                         vd: mongodb+srv://user:pass@cluster0.xxxxx.mongodb.net/autowash
 *
 * MONGODB_READ_POOL_SIZE — số read connection pool song song (mặc định 3).
 *                          Nên khớp với số secondary nodes trong Atlas cluster:
 *                            M10 → 2 secondaries → set 2
 *                            M30+ → 2+ secondaries → set 3
 */

import dotenv from 'dotenv';
dotenv.config();

export const env = {
  NODE_ENV: process.env.NODE_ENV ?? 'development',
  PORT: Number(process.env.PORT ?? 3000),

  // ── Database (Atlas) ─────────────────────────────────────────────────────────
  /** Atlas SRV URI — dùng cho cả read và write, routing qua readPreference */
  MONGODB_URI: process.env.MONGODB_URI!,
  /** Số read connection pool (round-robin). Mặc định 3. */
  MONGODB_READ_POOL_SIZE: Number(process.env.MONGODB_READ_POOL_SIZE ?? 3),

  // ── JWT ──────────────────────────────────────────────────────────────────────
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET!,
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET!,
  JWT_ACCESS_EXPIRES_IN: process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',

  // ── Google OAuth ─────────────────────────────────────────────────────────────
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID ?? '',
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET ?? '',
  GOOGLE_ANDROID_CLIENT_ID: process.env.GOOGLE_ANDROID_CLIENT_ID ?? '',
  GOOGLE_IOS_CLIENT_ID: process.env.GOOGLE_IOS_CLIENT_ID ?? '',

  // ── Email ────────────────────────────────────────────────────────────────────
  EMAIL_HOST: process.env.EMAIL_HOST ?? '',
  EMAIL_PORT: Number(process.env.EMAIL_PORT ?? 587),
  EMAIL_USER: process.env.EMAIL_USER ?? '',
  EMAIL_PASS: process.env.EMAIL_PASS ?? '',
  EMAIL_FROM: process.env.EMAIL_FROM ?? '',
  EMAIL_FROM_NAME: process.env.EMAIL_FROM_NAME ?? 'Hybrid Wash',
  BREVO_API_KEY: process.env.BREVO_API_KEY ?? '',

  // ── CORS ─────────────────────────────────────────────────────────────────────
  CLIENT_URL: process.env.CLIENT_URL ?? '',
  ADMIN_URL: process.env.ADMIN_URL ?? '',

  // ── Rate Limit ────────────────────────────────────────────────────────────────
  RATE_LIMIT_WINDOW_MS: Number(process.env.RATE_LIMIT_WINDOW_MS ?? 900000),
  RATE_LIMIT_MAX: Number(process.env.RATE_LIMIT_MAX ?? 100),

  // ── Redis ─────────────────────────────────────────────────────────────────────
  REDIS_HOST: process.env.REDIS_HOST ?? 'localhost',
  REDIS_PORT: Number(process.env.REDIS_PORT ?? 6379),
  REDIS_PASSWORD: process.env.REDIS_PASSWORD ?? '',
  REDIS_URL: process.env.REDIS_URL ?? '',

  // ── Payment ───────────────────────────────────────────────────────────────────
  PAYOS_CLIENT_ID: process.env.PAYOS_CLIENT_ID ?? '',
  PAYOS_API_KEY: process.env.PAYOS_API_KEY ?? '',
  PAYOS_CHECKSUM_KEY: process.env.PAYOS_CHECKSUM_KEY ?? '',
  PAYOS_RETURN_URL: process.env.PAYOS_RETURN_URL ?? 'http://localhost:5173/payment/success',
  PAYOS_CANCEL_URL: process.env.PAYOS_CANCEL_URL ?? 'http://localhost:5173/payment/cancel',

  // ── Gemini ────────────────────────────────────────────────────────────────────
  GEMINI_API_KEY: process.env.GEMINI_API_KEY ?? '',
  GEMINI_API_BASE: process.env.GEMINI_API_BASE ?? 'https://generativelanguage.googleapis.com/v1beta',
  GEMINI_EMBEDDING_MODEL: process.env.GEMINI_EMBEDDING_MODEL ?? 'gemini-embedding-001',
  GEMINI_GENERATION_MODEL: process.env.GEMINI_GENERATION_MODEL ?? 'gemini-2.0-flash',
  /** Timeout cho mỗi call Gemini (embed hoặc generate). Mạng lag/API treo sẽ bị abort sau khoảng này thay vì chờ vô hạn. */
  GEMINI_TIMEOUT_MS: Number(process.env.GEMINI_TIMEOUT_MS ?? 5000),
  RECOMMENDATION_CACHE_TTL_SECONDS: Number(process.env.RECOMMENDATION_CACHE_TTL_SECONDS ?? 1800),
} as const;