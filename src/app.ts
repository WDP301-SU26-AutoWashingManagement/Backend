/**
 * app.ts  (diff từ bản gốc)
 *
 * Thay đổi:
 *  1. Import disconnectDB để graceful shutdown
 *  2. Thêm dbRoutingMiddleware (observability)
 *  3. Graceful shutdown hook (SIGTERM / SIGINT)
 *
 * Phần còn lại giữ nguyên 100%.
 */

import 'dotenv/config';
import express from 'express';
import path from 'path';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import morgan from 'morgan';
import mongoSanitize from 'express-mongo-sanitize';
import 'reflect-metadata';

import { connectDB, disconnectDB } from './configs/db.config';
import { errorHandler, notFoundHandler } from './common/middleware/error.middleware';
import { logger } from './common/utils/logger';
import { connectRedis } from './configs/redis.config';
import { initRedisCache } from './modules/redis/redis-cache.init';
import routes from './routes';
import { rateLimiter } from './configs/rateLimit.config';
import { loadModels } from './models/global/model.load';
import { dbRoutingMiddleware } from './common/middleware/dbRouting.middleware';
import seedBoss from '@common/seeds/seed.boss';
import seedVehicle from '@common/seeds/seed.vehicle';
import { scheduleCronService } from '@modules/staff-manager/services/schedule-auto.service';
import { bookingCronService } from '@modules/booking/services/booking-cron.service';

const app = express();
app.set('trust proxy', 1);

// ── Security ──────────────────────────────────────────────────────────────────
app.use(helmet());
app.use(mongoSanitize());

const allowedOrigins = [
  process.env.CLIENT_URL,
  process.env.ADMIN_URL,
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:8081',
].filter(Boolean) as string[];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      const isAllowed =
        allowedOrigins.includes(origin) ||
        /^https?:\/\/localhost(:\d+)?$/.test(origin) ||
        /^https?:\/\/127\.0\.0\.1(:\d+)?$/.test(origin) ||
        /^https?:\/\/192\.168\.\d+\.\d+(:\d+)?$/.test(origin) ||
        /^https?:\/\/10\.\d+\.\d+\.\d+(:\d+)?$/.test(origin) ||
        /^https?:\/\/172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+(:\d+)?$/.test(origin);
      isAllowed ? callback(null, true) : callback(new Error(`Origin ${origin} not allowed by CORS`));
    },
    credentials: true,
  }),
);

app.use(rateLimiter);

// ── Parsing & Logging ─────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(compression());
app.use(morgan('combined'));

// ── DB Routing tag (observability) ────────────────────────────────────────────
app.use(dbRoutingMiddleware);  // ← mới: gắn req.dbIntent = 'read' | 'write'

// ── Health ────────────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// ── Static Files ──────────────────────────────────────────────────────────────
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// ── API Routes ────────────────────────────────────────────────────────────────
app.use('/api/v1', routes);

// ── Error Handling ────────────────────────────────────────────────────────────
app.use(notFoundHandler);
app.use(errorHandler);

import { iotService } from './modules/iot/services/iot.service';

// ── Boot ──────────────────────────────────────────────────────────────────────
const bootstrap = async (): Promise<void> => {
  loadModels();
  await connectDB();   // ← kết nối primary + replicas
  await connectRedis();
  initRedisCache();

  await seedBoss();
  await seedVehicle();

  console.log('[SERVER] Starting cron...');
  scheduleCronService.init();
  bookingCronService.init();

  console.log('[SERVER] Starting MQTT IoT Service...');
  iotService.init();

  const PORT = process.env.PORT ?? 3000;
  const server = app.listen(PORT, () =>
    logger.info(`🚀 Server running on port ${PORT}`),
  );

  // ── Graceful Shutdown ─────────────────────────────────────────────────────
  const shutdown = async (signal: string) => {
    logger.info(`[SHUTDOWN] ${signal} received — closing server...`);
    server.close(async () => {
      await disconnectDB();
      logger.info('[SHUTDOWN] All connections closed!');
      process.exit(0);
    });
    // Force exit nếu server không close sau 10s
    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT',  () => shutdown('SIGINT'));
};

bootstrap().catch((err) => {
  logger.error('Bootstrap failed', err);
  process.exit(1);
});

export default app;