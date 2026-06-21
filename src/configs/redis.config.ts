import { createClient } from 'redis';
import { env } from './env.config';
import { logger } from '../common/utils/logger';

// Cloud Redis (Upstash, Azure, AWS...) tự đóng kết nối TCP khi rảnh (idle) một lúc.
// Không có reconnectStrategy → mỗi lần bị đóng là 1 dòng lỗi log ra, lặp vô hạn.
const reconnectStrategy = (retries: number) => {
  if (retries > 10) {
    logger.error('[redis] Quá nhiều lần reconnect thất bại, dừng thử lại.');
    return new Error('Too many Redis reconnect attempts');
  }
  return Math.min(retries * 200, 3000); // backoff tăng dần, tối đa 3s/lần
};

// Local dev (docker-compose) dùng REDIS_HOST/PORT/PASSWORD.
// Deploy cloud (vd: Upstash) chỉ cần set REDIS_URL (dạng rediss://default:xxx@xxx.upstash.io:6379), ưu tiên dùng URL này.
export const redisClient = env.REDIS_URL
  ? createClient({
      url: env.REDIS_URL,
      socket: { reconnectStrategy },
      // Gửi PING định kỳ để giữ kết nối "sống" — tránh Upstash tự đóng socket vì idle.
      pingInterval: 60_000,
    })
  : createClient({
      socket: {
        host: env.REDIS_HOST,
        port: env.REDIS_PORT,
        reconnectStrategy,
      },
      password: env.REDIS_PASSWORD || undefined,
    });

redisClient.on('error', (err) => logger.error('Redis error', err));

export const connectRedis = async () => {
  await redisClient.connect();
  logger.info('Redis connected');
};
