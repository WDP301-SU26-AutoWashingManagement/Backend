import { createClient } from 'redis';
import { env } from './env.config';
import { logger } from '../common/utils/logger';

export const redisClient = createClient({
  socket: {
    host: env.REDIS_HOST,
    port: env.REDIS_PORT,
  },
  password: env.REDIS_PASSWORD || undefined,
});

redisClient.on('error', (err) => logger.error('Redis error', err));

export const connectRedis = async () => {
  await redisClient.connect();
  logger.info('Redis connected');
};