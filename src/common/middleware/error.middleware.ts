import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError';
import { sendError } from '../utils/apiResponse';
import { logger } from '../utils/logger';

export const errorHandler = (err: Error, req: Request, res: Response, _next: NextFunction): void => {
  // : handle Mongoose CastError, ValidationError, duplicate key (11000)
  const statusCode = err instanceof AppError ? err.statusCode : 500;
  const message    = err instanceof AppError ? err.message    : 'Internal Server Error';
  const errors     = err instanceof AppError ? err.errors      : undefined;
  if (statusCode >= 500) logger.error(`[${req.method}] ${req.path}`, err);
  sendError(res, message, statusCode, errors);
};

export const notFoundHandler = (req: Request, _res: Response, next: NextFunction): void =>
  next(new AppError(`Route ${req.method} ${req.originalUrl} not found`, 404));
