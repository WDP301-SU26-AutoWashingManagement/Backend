import rateLimit from "express-rate-limit";
import {env} from './env.config'

export const rateLimiter = rateLimit({
  windowMs: Number(env.RATE_LIMIT_WINDOW_MS),
  max: Number(env.RATE_LIMIT_MAX),
  standardHeaders: true,
  legacyHeaders: false
});

export const promotionValidateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { message: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});