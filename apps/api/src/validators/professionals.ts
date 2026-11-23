import { z } from 'zod';
import {
  categoryCodeSchema,
  coordinatesSchema,
  dateOnlySchema,
  dateTimeSchema,
  intervalSchema,
  objectId,
  paginationSchema,
  weekdaySchema,
} from './common';

export const listProfessionalsQuerySchema = paginationSchema.extend({
  category: categoryCodeSchema.optional(),
  specialty: z.string().trim().max(120).optional(),
  search: z.string().trim().max(120).optional(),
  minRating: z.coerce.number().min(0).max(5).optional(),
  sort: z.enum(['rating', 'name', 'createdAt']).optional().default('rating'),
});

export const nearbyQuerySchema = paginationSchema.extend({
  latitude: z.coerce.number().min(-90).max(90).optional(),
  longitude: z.coerce.number().min(-180).max(180).optional(),
  radiusMeters: z.coerce.number().int().min(100).max(50000).optional(),
  category: categoryCodeSchema.optional(),
  specialty: z.string().trim().max(120).optional(),
  search: z.string().trim().max(120).optional(),
  minRating: z.coerce.number().min(0).max(5).optional(),
  date: dateOnlySchema.optional(),
  serviceId: objectId.optional(),
  sort: z
    .enum(['distance', 'rating', 'availability'])
    .optional()
    .default('distance'),
  includeNextAvailability: z
    .enum(['true', 'false'])
    .optional()
    .default('false'),
});

export const updateProfileSchema = z.object({
  displayName: z.string().trim().min(2).max(120).optional(),
  businessName: z.string().trim().min(2).max(160).optional(),
  description: z.string().trim().max(2000).optional(),
  addressText: z.string().trim().max(300).optional(),
  categories: z.array(categoryCodeSchema).min(1).max(4).optional(),
  specialties: z.array(z.string().trim().max(120)).max(30).optional(),
  offersHomeService: z.boolean().optional(),
  photoUrl: z.string().trim().max(500).nullable().optional(),
});

export const updateLocationSchema = coordinatesSchema.extend({
  addressText: z.string().trim().max(300).optional(),
});

const serviceBody = {
  categoryCode: categoryCodeSchema,
  specialtyId: objectId.nullable().optional(),
  specialtyName: z.string().trim().max(120).nullable().optional(),
  name: z.string().trim().min(2).max(160),
  description: z.string().trim().max(1000).optional().default(''),
  estimatedDurationMinutes: z.coerce
    .number()
    .int()
    .min(15)
    .max(480)
    .refine((value) => value % 15 === 0, {
      message: 'La duracion debe ser multiple de 15 minutos.',
    }),
  estimatedPrice: z.coerce.number().min(0).max(1000000).nullable().optional(),
  active: z.boolean().optional().default(true),
};

export const createServiceSchema = z.object(serviceBody);

export const updateServiceSchema = z
  .object(serviceBody)
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'No se enviaron cambios.',
  });

export const scheduleSchema = z.object({
  days: z
    .array(
      z.object({
        dayOfWeek: weekdaySchema,
        intervals: z.array(intervalSchema).default([]),
        breaks: z.array(intervalSchema).default([]),
        active: z.boolean().default(true),
      }),
    )
    .min(1, 'Debes enviar al menos un dia.'),
});

export const availabilityExceptionSchema = z
  .object({
    startAt: dateTimeSchema,
    endAt: dateTimeSchema,
    type: z
      .enum(['BLOCKED', 'SPECIAL_HOURS', 'VACATION', 'BREAK'])
      .default('BLOCKED'),
    reason: z.string().trim().max(300).optional().default(''),
  })
  .refine((data) => new Date(data.startAt) < new Date(data.endAt), {
    message: 'La fecha final debe ser posterior a la inicial.',
    path: ['endAt'],
  });

export const availabilityQuerySchema = z.object({
  from: dateOnlySchema,
  to: dateOnlySchema,
  serviceId: objectId.optional(),
  timezone: z.string().trim().max(60).optional(),
});

export const calendarQuerySchema = z.object({
  from: dateOnlySchema.optional(),
  to: dateOnlySchema.optional(),
});

export const professionalIdParamsSchema = z.object({ id: objectId });

export const uploadDocumentSchema = z.object({
  documentType: z.string().trim().min(2).max(80),
});
