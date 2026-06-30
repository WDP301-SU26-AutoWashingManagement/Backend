/**
 * dbRouting.middleware.ts
 *
 * Middleware tuỳ chọn — gắn tag `req.dbIntent` để:
 *  - Logging / tracing biết request đang đi vào read hay write path
 *  - Có thể dùng để enforce thêm tầng routing nếu cần
 *
 * GET / HEAD / OPTIONS → 'read'
 * POST / PUT / PATCH / DELETE → 'write'
 *
 * Không cần thiết cho hoạt động của BaseRepository
 * (đã tự route đúng connection), nhưng hữu ích cho observability.
 */

import { Request, Response, NextFunction } from 'express';

declare global {
  namespace Express {
    interface Request {
      dbIntent?: 'read' | 'write';
    }
  }
}

const READ_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

export const dbRoutingMiddleware = (
  req: Request,
  _res: Response,
  next: NextFunction,
): void => {
  req.dbIntent = READ_METHODS.has(req.method) ? 'read' : 'write';
  next();
};