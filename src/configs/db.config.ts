import mongoose from 'mongoose';
import { env } from './env.config';
import { logger } from '../common/utils/logger';
 
export const connectDB = async (): Promise<void> => {
  await mongoose.connect(env.MONGODB_URI);
  logger.info(`MongoDB connected: ${mongoose.connection.host}`);
};
 