import dotenv from 'dotenv';
dotenv.config();

export const env = {
  NODE_ENV: process.env.NODE_ENV ?? 'development',
  PORT: Number(process.env.PORT ?? 3000),
  MONGODB_URI: process.env.MONGODB_URI!,
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET!,
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET!,
  JWT_ACCESS_EXPIRES_IN: process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID ?? '',
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET ?? '',
  GOOGLE_ANDROID_CLIENT_ID: process.env.GOOGLE_ANDROID_CLIENT_ID ?? '',
  GOOGLE_IOS_CLIENT_ID: process.env.GOOGLE_IOS_CLIENT_ID ?? '',
  EMAIL_HOST: process.env.EMAIL_HOST ?? '',
  EMAIL_PORT: Number(process.env.EMAIL_PORT ?? 587),
  EMAIL_USER: process.env.EMAIL_USER ?? '',
  EMAIL_PASS: process.env.EMAIL_PASS ?? '',
  EMAIL_FROM: process.env.EMAIL_FROM ?? '',
  EMAIL_FROM_NAME: process.env.EMAIL_FROM_NAME ?? 'AutoWash',
  // Brevo REST API (gửi email qua HTTP thay vì SMTP — không bị Render/Railway free tier chặn port).
  BREVO_API_KEY: process.env.BREVO_API_KEY ?? '',
  CLIENT_URL: process.env.CLIENT_URL ?? '',
  ADMIN_URL: process.env.ADMIN_URL ?? '',
  RATE_LIMIT_WINDOW_MS: Number(process.env.RATE_LIMIT_WINDOW_MS ?? 900000),
  RATE_LIMIT_MAX: Number(process.env.RATE_LIMIT_MAX ?? 100),
  REDIS_HOST: process.env.REDIS_HOST ?? 'localhost',
  REDIS_PORT: Number(process.env.REDIS_PORT ?? 6379),
  REDIS_PASSWORD: process.env.REDIS_PASSWORD ?? '',
  // Set REDIS_URL khi deploy lên cloud (vd: Upstash) — ưu tiên dùng URL này thay vì host/port/password.
  REDIS_URL: process.env.REDIS_URL ?? '',
  PAYOS_CLIENT_ID   : process.env.PAYOS_CLIENT_ID    ?? '',
  PAYOS_API_KEY     : process.env.PAYOS_API_KEY      ?? '',
  PAYOS_CHECKSUM_KEY: process.env.PAYOS_CHECKSUM_KEY ?? '',
  PAYOS_RETURN_URL  : process.env.PAYOS_RETURN_URL   ?? 'http://localhost:5173/payment/success',
  PAYOS_CANCEL_URL  : process.env.PAYOS_CANCEL_URL   ?? 'http://localhost:5173/payment/cancel',

  // ── Gemini (RAG recommendation) ──────────────────────────────────────────
  GEMINI_API_KEY        : process.env.GEMINI_API_KEY ?? '',
  GEMINI_API_BASE        : process.env.GEMINI_API_BASE ?? 'https://generativelanguage.googleapis.com/v1beta',
  GEMINI_EMBEDDING_MODEL : process.env.GEMINI_EMBEDDING_MODEL ?? 'gemini-embedding-001',
  GEMINI_GENERATION_MODEL: process.env.GEMINI_GENERATION_MODEL ?? 'gemini-2.0-flash',
  RECOMMENDATION_CACHE_TTL_SECONDS: Number(process.env.RECOMMENDATION_CACHE_TTL_SECONDS ?? 1800), // 30phuts
} as const;