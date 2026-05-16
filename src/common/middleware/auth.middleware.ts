import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env.config';
import { UnauthorizedError, ForbiddenError } from '../utils/AppError';
import { JwtPayload, AuthenticatedRequest, UserRole } from '../types';

export const authenticate = (req: Request, _res: Response, next: NextFunction): void => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) throw new UnauthorizedError('No token provided');
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtPayload;
    (req as AuthenticatedRequest).user = decoded;
    next();
  } catch (err) { next(err); }
};

export const authorize = (...roles: UserRole[]) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    const { user } = req as AuthenticatedRequest;
    if (!roles.includes(user?.role)) return next(new ForbiddenError());
    next();
  };
