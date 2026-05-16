import jwt from 'jsonwebtoken';
import { env } from '../../configs/env.config';
import { JwtPayload } from '../types';

export const signAccessToken  = (payload: JwtPayload): string =>
  jwt.sign(payload, env.JWT_ACCESS_SECRET, { expiresIn: env.JWT_ACCESS_EXPIRES_IN } as jwt.SignOptions);

export const signRefreshToken = (payload: JwtPayload): string =>
  jwt.sign(payload, env.JWT_REFRESH_SECRET, { expiresIn: env.JWT_REFRESH_EXPIRES_IN } as jwt.SignOptions);

export const verifyRefreshToken = (token: string): JwtPayload =>
  jwt.verify(token, env.JWT_REFRESH_SECRET) as JwtPayload;

export const generateTokenPair = (id: string, role: JwtPayload['role']) => ({
  accessToken:  signAccessToken({ id, role }),
  refreshToken: signRefreshToken({ id, role }),
});
