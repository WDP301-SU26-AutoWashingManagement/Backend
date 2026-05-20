import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types';
import { logger } from '../utils/logger';

export const auditLog = (action: string, entity: string) =>
  (req: Request, res: Response, next: NextFunction): void => {
    res.on('finish', () => {
      if (res.statusCode < 300) {
        const adminId = (req as AuthenticatedRequest).user?.id;
        logger.info(`AUDIT | admin=${adminId} action=${action} entity=${entity} target=${req.params.id ?? '-'}`);
      }
    });
    next();
  };
