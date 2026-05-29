import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { ValidationError } from '../utils/AppError';

type Source = 'body' | 'query' | 'params';

export const validate = (schema: Joi.ObjectSchema, source: Source = 'body') =>
  (req: Request, _res: Response, next: NextFunction): void => {

    const { error, value } = schema.validate(req[source], {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      console.log(error.details);

      const errors = error.details.map((d) => ({
        field: d.path.join('.'),
        message: d.message.replace(/"/g, '')
      }));

      return next(new ValidationError('Validation failed', errors));
    }

    (req as Request)[source] = value;
    next();
  };