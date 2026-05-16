import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import morgan from 'morgan';
import mongoSanitize from 'express-mongo-sanitize';
import rateLimit from 'express-rate-limit';

import { connectDB } from './configs/db.config';
import { errorHandler, notFoundHandler } from './common/middleware/error.middleware';
import { logger } from './common/utils/logger';
import routes from './routes';

const app = express();

// ── Security ──────────────────────────────────────────────────────────────────
app.use(helmet());
app.use(mongoSanitize());
app.use(cors({ /* TODO: load from env.config */ }));
app.use(rateLimit({ /* TODO: load from env.config */ }));

// ── Parsing & Logging ─────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(compression());
app.use(morgan('combined'));

// ── Health ────────────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// ── API Routes ────────────────────────────────────────────────────────────────
app.use('/api/v1', routes);

// ── Error Handling ────────────────────────────────────────────────────────────
app.use(notFoundHandler);
app.use(errorHandler);

// ── Boot ──────────────────────────────────────────────────────────────────────
const bootstrap = async (): Promise<void> => {
  await connectDB();
  const PORT = process.env.PORT ?? 3000;
  app.listen(PORT, () => logger.info(`🚀 Server running on port ${PORT}`));
};

bootstrap().catch((err) => {
  logger.error('Bootstrap failed', err);
  process.exit(1);
});

export default app;