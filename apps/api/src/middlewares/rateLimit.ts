import rateLimit from 'express-rate-limit';

const buildLimiter = (windowMs: number, max: number, message: string) =>
  rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      error: {
        code: 'TOO_MANY_REQUESTS',
        message,
      },
    },
  });

export const generalLimiter = buildLimiter(
  15 * 60 * 1000,
  600,
  'Demasiadas solicitudes. Intenta nuevamente en unos minutos.',
);

export const authLimiter = buildLimiter(
  15 * 60 * 1000,
  20,
  'Demasiados intentos de autenticacion. Espera antes de reintentar.',
);

export const registerLimiter = buildLimiter(
  60 * 60 * 1000,
  30,
  'Demasiados registros desde esta conexion.',
);

export const bookingLimiter = buildLimiter(
  10 * 60 * 1000,
  60,
  'Demasiadas solicitudes de reserva. Espera un momento.',
);

export const writeLimiter = buildLimiter(
  10 * 60 * 1000,
  200,
  'Demasiadas operaciones. Espera un momento.',
);
