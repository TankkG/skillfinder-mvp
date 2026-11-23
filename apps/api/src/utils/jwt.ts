import crypto from 'node:crypto';
import jwt, { type SignOptions } from 'jsonwebtoken';
import type { Role, UserStatus } from '@skillfinder/shared';
import { env } from '../config/env';

export interface AccessTokenPayload {
  sub: string;
  role: Role;
  status: UserStatus;
  email: string;
  name: string;
  type: 'access';
}

export interface RefreshTokenPayload {
  sub: string;
  jti: string;
  type: 'refresh';
}

export const signAccessToken = (payload: Omit<AccessTokenPayload, 'type'>): string =>
  jwt.sign(
    { ...payload, type: 'access' },
    env.JWT_ACCESS_SECRET,
    { expiresIn: env.ACCESS_TOKEN_EXPIRES_IN as SignOptions['expiresIn'] },
  );

export const signRefreshToken = (userId: string, sessionId: string): string =>
  jwt.sign(
    { sub: userId, jti: sessionId, type: 'refresh' },
    env.JWT_REFRESH_SECRET,
    { expiresIn: env.REFRESH_TOKEN_EXPIRES_IN as SignOptions['expiresIn'] },
  );

export const verifyAccessToken = (token: string): AccessTokenPayload => {
  const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET);
  if (typeof decoded === 'string' || decoded.type !== 'access') {
    throw new Error('Token de acceso invalido.');
  }
  return decoded as AccessTokenPayload;
};

export const verifyRefreshToken = (token: string): RefreshTokenPayload => {
  const decoded = jwt.verify(token, env.JWT_REFRESH_SECRET);
  if (typeof decoded === 'string' || decoded.type !== 'refresh') {
    throw new Error('Token de renovacion invalido.');
  }
  return decoded as RefreshTokenPayload;
};

export const hashToken = (token: string): string =>
  crypto.createHash('sha256').update(token).digest('hex');

export const randomToken = (bytes = 32): string =>
  crypto.randomBytes(bytes).toString('hex');
