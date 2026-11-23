import { z } from 'zod';
import {
  coordinatesSchema,
  dateTimeSchema,
  objectId,
  paginationSchema,
} from './common';

export const createBookingSchema = z.object({
  professionalId: objectId,
  serviceId: objectId,
  startAt: dateTimeSchema,
  notes: z.string().trim().max(1000).optional().default(''),
  serviceLocationType: z.enum(['AT_BUSINESS', 'AT_CUSTOMER']).optional(),
  serviceLocation: coordinatesSchema.optional(),
  idempotencyKey: z.string().trim().min(8).max(120).optional(),
});

export const bookingActionSchema = z.object({
  reason: z.string().trim().max(500).optional(),
});

export const rejectBookingSchema = bookingActionSchema;

export const cancelBookingSchema = bookingActionSchema;

export const createReviewSchema = z.object({
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().trim().max(1000).optional().default(''),
});

export const sendBookingMessageSchema = z.object({
  message: z.string().trim().min(1, 'Escribe un mensaje.').max(1000),
});

export const listBookingsQuerySchema = paginationSchema.extend({
  status: z
    .enum([
      'PENDING_PROFESSIONAL',
      'CONFIRMED',
      'REJECTED',
      'CANCELLED_BY_CLIENT',
      'CANCELLED_BY_PROFESSIONAL',
      'EXPIRED',
      'IN_PROGRESS',
      'COMPLETED',
      'NO_SHOW',
    ])
    .optional(),
  scope: z.enum(['upcoming', 'history', 'all']).optional().default('all'),
});

export const bookingIdParamsSchema = z.object({ id: objectId });

export const idempotencyKeyFrom = (header?: string): string | undefined =>
  header && header.trim().length >= 8 && header.length <= 120
    ? header.trim()
    : undefined;
