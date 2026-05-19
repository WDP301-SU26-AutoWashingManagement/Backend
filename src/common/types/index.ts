import { Request } from 'express';
import { Types } from 'mongoose';

export type UserRole = 'customer' | 'admin';

export interface JwtPayload {
  id: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

export interface AuthenticatedRequest extends Request {
  user: JwtPayload;
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
  search?: string;
}

declare global {
  namespace Express {
    interface Request {
      user: JwtPayload; 
    }
  }
}
export type MongoId = Types.ObjectId | string;