import type { NextFunction, Request, Response } from 'express';
import type { Role } from '@skillfinder/shared';
import { USER_STATUSES } from '@skillfinder/shared';
import { User } from '../models';
import { ApiError } from '../utils/errors';
import { verifyAccessToken, type AccessTokenPayload } from '../utils/jwt';
import { asyncHandler } from '../utils/asyncHandler';

const extractToken = (req: Request): string | null => {
  const header = req.get('authorization');
  if (!header) return null;
  const [scheme, token] = header.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !token) return null;
  return token;
};

const resolveUser = async (payload: AccessTokenPayload) => {
  const user = await User.findById(payload.sub);
  if (!user) {
    throw ApiError.unauthorized('La cuenta no existe o fue eliminada.');
  }
  if (
    user.status === USER_STATUSES.SUSPENDED ||
    user.status === USER_STATUSES.BLOCKED
  ) {
    throw ApiError.forbidden('La cuenta esta suspendida o bloqueada.');
  }
  return user;
};

export const requireAuth = asyncHandler(
  async (req: Request, _res: Response, next: NextFunction) => {
    const token = extractToken(req);
    if (!token) {
      throw ApiError.unauthorized('Falta el token de acceso.');
    }
    let payload: AccessTokenPayload;
    try {
      payload = verifyAccessToken(token);
    } catch {
      throw ApiError.unauthorized('Token de acceso invalido o expirado.');
    }
    const user = await resolveUser(payload);
    req.user = {
      id: user.id,
      role: user.role as Role,
      status: user.status as Express.AuthUser['status'],
      email: user.email,
      name: user.name,
    };
    next();
  },
);

export const optionalAuth = asyncHandler(
  async (req: Request, _res: Response, next: NextFunction) => {
    const token = extractToken(req);
    if (!token) {
      next();
      return;
    }
    try {
      const payload = verifyAccessToken(token);
      const user = await resolveUser(payload);
      req.user = {
        id: user.id,
        role: user.role as Role,
        status: user.status as Express.AuthUser['status'],
        email: user.email,
        name: user.name,
      };
    } catch {
      // La autenticacion opcional no bloquea la peticion publica.
    }
    next();
  },
);

export const requireRole =
  (...roles: Role[]) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(ApiError.unauthorized());
      return;
    }
    if (!roles.includes(req.user.role)) {
      next(ApiError.forbidden('El rol de la cuenta no permite esta operacion.'));
      return;
    }
    next();
  };
