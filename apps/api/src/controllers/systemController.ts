import mongoose from 'mongoose';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/errors';
import { env } from '../config/env';
import { getFaqItems, getPublicContent } from '../services/content';

export const health = asyncHandler(async (_req, res) => {
  const dbState = mongoose.connection.readyState;
  res.json({
    status: dbState === 1 ? 'ok' : 'degraded',
    database: dbState === 1 ? 'connected' : 'disconnected',
    timezone: env.DEFAULT_TIMEZONE,
    slotMinutes: env.BOOKING_SLOT_MINUTES,
    holdMinutes: env.BOOKING_HOLD_MINUTES,
    environment: env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

export const helpFaq = asyncHandler(async (_req, res) => {
  res.json({ items: await getFaqItems() });
});

export const publicContent = asyncHandler(async (req, res) => {
  const entry = await getPublicContent(req.params.key);
  if (!entry) throw ApiError.notFound('Contenido no encontrado.');
  res.json({ entry });
});
