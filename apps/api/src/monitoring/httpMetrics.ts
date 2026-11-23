import type { NextFunction, Request, Response } from 'express';
import {
  httpRequestDuration,
  httpRequestsTotal,
  searchDuration,
} from './registry';

const normalizeRoute = (req: Request): string => {
  const routePath = req.route?.path;
  if (typeof routePath !== 'string') return 'unmatched';

  // Express restaura baseUrl al salir del router. Reconstruimos el prefijo
  // desde la URL original, pero conservamos el patron de ruta (/:id),
  // nunca el identificador real ni los parametros de consulta.
  const originalPath = req.originalUrl.split('?')[0] || '/';
  const prefixes = [
    '/api/professionals',
    '/api/bookings',
    '/api/reviews',
    '/api/auth',
    '/api/notifications',
    '/api/favorites',
    '/api/reports',
    '/api/admin',
    '/api',
  ];
  const prefix = prefixes.find(
    (candidate) => originalPath === candidate || originalPath.startsWith(`${candidate}/`),
  );
  const joined = routePath.startsWith('/api/')
    ? routePath
    : `${prefix ?? ''}${routePath.startsWith('/') ? routePath : `/${routePath}`}`.replace(/\/{2,}/g, '/');
  if (joined.length > 160) return 'other';
  return joined || '/';
};

export const httpMetricsMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const startedAt = process.hrtime.bigint();

  res.on('finish', () => {
    const duration = Number(process.hrtime.bigint() - startedAt) / 1_000_000_000;
    const route = normalizeRoute(req);
    const method = req.method.toUpperCase();
    const status = String(res.statusCode);

    httpRequestsTotal.inc({ method, route, status_code: status });
    httpRequestDuration.observe(duration, {
      method,
      route,
      status_code: status,
    });

    const originalPath = req.originalUrl.split('?')[0] || '/';
    const isProfessionalSearch =
      method === 'GET' &&
      (originalPath === '/api/professionals' ||
        originalPath === '/api/professionals/' ||
        originalPath === '/api/professionals/nearby');
    if (isProfessionalSearch) searchDuration.observe(duration);
  });

  next();
};

