/**
 * db.config.ts  —  MongoDB Atlas edition
 *
 * Root cause của lỗi cũ:
 *  - mongoose.model() bind vào mongoose.connection (default connection).
 *  - Ta dùng mongoose.createConnection() riêng → default connection không bao giờ connect
 *    → mọi query qua Model trực tiếp (seed, v.v.) bị buffer timeout.
 *
 * Giải pháp:
 *  - WRITE: dùng mongoose.connect() → gắn vào default connection (readPreference=primary)
 *    → toàn bộ mongoose.model() hoạt động bình thường.
 *  - READ pool: vẫn dùng mongoose.createConnection() với readPreference=secondaryPreferred
 *    → BaseRepository.rm dùng pool này qua model.bind(conn).
 */

import mongoose, { Connection } from 'mongoose';
import { env } from './env.config';
import { logger } from '../common/utils/logger';

const READ_POOL_SIZE = Number(process.env.MONGODB_READ_POOL_SIZE ?? 3);
const BASE_URI = env.MONGODB_URI;

// ─── State ────────────────────────────────────────────────────────────────────

const readPool: Connection[] = [];
let rrIndex = 0;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const makeReadConn = (tag: string): Connection => {
  const conn = mongoose.createConnection(BASE_URI, {
    readPreference: 'secondaryPreferred',
    maxStalenessSeconds: 90,
    maxPoolSize: 5,
    minPoolSize: 1,
    serverSelectionTimeoutMS: 8_000,
    socketTimeoutMS: 30_000,
    connectTimeoutMS: 15_000,
    heartbeatFrequencyMS: 10_000,
    tls: true,
    autoIndex: false,
  });

  conn.on('connected', () => logger.info(`[DB][${tag}] connected to Atlas`));
  conn.on('disconnected', () => logger.warn(`[DB][${tag}] disconnected`));
  conn.on('reconnected', () => logger.info(`[DB][${tag}] reconnected`));
  conn.on('error', (err) => logger.error(`[DB][${tag}] error`, err));

  return conn;
};

// ─── Public API ───────────────────────────────────────────────────────────────

export const connectDB = async (): Promise<void> => {
  // ── 1. Write — dùng mongoose.connect() để gắn vào default connection ────────
  //    mongoose.model() sẽ tự dùng connection này → seed & model hoạt động đúng
  await mongoose.connect(BASE_URI, {
    readPreference: 'primary',
    maxPoolSize: 10,
    minPoolSize: 1,
    serverSelectionTimeoutMS: 8_000,
    socketTimeoutMS: 30_000,
    connectTimeoutMS: 15_000,
    heartbeatFrequencyMS: 10_000,
    tls: true,
  });
  logger.info(`[DB][WRITE] connected to Atlas (default connection)`);

  // ── 2. Read pool ─────────────────────────────────────────────────────────────
  await Promise.all(
    Array.from({ length: READ_POOL_SIZE }, async (_, i) => {
      const tag = `READ_${i + 1}`;
      const conn = makeReadConn(tag);
      await conn.asPromise();

      mongoose.modelNames().forEach(name => {
        // Nếu Read Connection chưa có model này
        if (!conn.modelNames().includes(name)) {
          // Thực hiện đăng ký model đó (copy schema) sang Read Connection
          conn.model(name, mongoose.model(name).schema);
        }
      });
      readPool.push(conn);
      logger.info(`[DB] ${tag} ready`);
    }),
  );

  logger.info(
    `[DB] Atlas setup complete — 1 write (default) + ${readPool.length} read pool(s) (round-robin)`,
  );
};

/**
 * Write connection = mongoose.connection (default).
 * BaseRepository.wm dùng cái này — đồng thời cũng là connection mà
 * mongoose.model() đang dùng, nên seed/model hoạt động nhất quán.
 */
export const getWriteConnection = (): Connection => {
  return mongoose.connection;
};

/**
 * Read connection — round-robin qua read pool (secondaryPreferred).
 * Fallback về default connection nếu read pool chưa sẵn sàng.
 */
export const getReadConnection = (): Connection => {
  if (readPool.length === 0) return mongoose.connection;
  const conn = readPool[rrIndex % readPool.length];
  rrIndex = (rrIndex + 1) % readPool.length;
  return conn;
};

/**
 * Graceful shutdown.
 */
export const disconnectDB = async (): Promise<void> => {
  await Promise.all([
    mongoose.disconnect(),
    ...readPool.map((c) => c.close()),
  ]);
  logger.info('[DB] All Atlas connections closed');
};