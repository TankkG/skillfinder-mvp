import { z } from 'zod';
import {
  intervalSchema,
  objectId,
  paginationSchema,
  weekdaySchema,
} from './common';

export const verificationSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED', 'REQUIRES_CORRECTION']),
  reason: z.string().trim().max(500).optional(),
});

export const userStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'SUSPENDED', 'BLOCKED']),
  reason: z.string().trim().max(500).optional(),
});

export const resolveReportSchema = z.object({
  status: z.enum(['IN_REVIEW', 'RESOLVED', 'DISMISSED']),
  resolution: z.string().trim().max(1000).optional(),
});

export const documentReviewSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED', 'REQUIRES_CORRECTION']),
  rejectionReason: z.string().trim().max(500).optional(),
});

export const reviewModerationSchema = z.object({
  status: z.enum(['PUBLISHED', 'HIDDEN']),
  note: z.string().trim().max(500).optional(),
});

export const categoryCreateSchema = z.object({
  code: z.string().trim().min(2).max(20).optional(),
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(500).optional().default(''),
  parentId: objectId.nullable().optional(),
  sortOrder: z.coerce.number().int().min(0).optional().default(0),
});

export const categoryUpdateSchema = z
  .object({
    name: z.string().trim().min(2).max(120).optional(),
    description: z.string().trim().max(500).optional(),
    active: z.boolean().optional(),
    sortOrder: z.coerce.number().int().min(0).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'No se enviaron cambios.',
  });

export const serviceAreaUpdateSchema = z.object({
  name: z.string().trim().min(2).max(160).optional(),
  boundary: z
    .object({
      type: z.literal('Polygon'),
      coordinates: z
        .array(
          z.array(
            z
              .tuple([z.coerce.number().min(-180).max(180), z.coerce.number().min(-90).max(90)])
              .or(z.array(z.coerce.number()).length(2)),
          ),
        )
        .min(1),
    })
    .optional(),
  sourceReference: z.string().trim().max(500).optional(),
  active: z.boolean().optional(),
});

const contentFaqItemSchema = z.object({
  question: z.string().trim().min(2).max(300),
  answer: z.string().trim().min(2).max(4000),
});

export const contentCreateSchema = z.object({
  key: z
    .string()
    .trim()
    .toLowerCase()
    .min(2)
    .max(80)
    .regex(/^[a-z0-9-]+$/, 'Usa minusculas, numeros y guiones.'),
  kind: z.enum(['FAQ', 'POLICY', 'INFO']).default('INFO'),
  title: z.string().trim().min(2).max(160),
  body: z.string().max(12000).default(''),
  items: z.array(contentFaqItemSchema).max(50).default([]),
  published: z.boolean().default(true),
  sortOrder: z.coerce.number().int().min(0).default(0),
});

export const contentUpdateSchema = z
  .object({
    kind: z.enum(['FAQ', 'POLICY', 'INFO']).optional(),
    title: z.string().trim().min(2).max(160).optional(),
    body: z.string().max(12000).optional(),
    items: z.array(contentFaqItemSchema).max(50).optional(),
    published: z.boolean().optional(),
    sortOrder: z.coerce.number().int().min(0).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'No se enviaron cambios.',
  });

export const scheduleAdminSchema = z.object({
  days: z.array(
    z.object({
      dayOfWeek: weekdaySchema,
      intervals: z.array(intervalSchema).default([]),
      breaks: z.array(intervalSchema).default([]),
      active: z.boolean().default(true),
    }),
  ),
});

export const adminListQuerySchema = paginationSchema.extend({
  status: z.string().trim().max(40).optional(),
  search: z.string().trim().max(120).optional(),
  role: z.enum(['CLIENT', 'PROFESSIONAL', 'ADMIN']).optional(),
});

export const reportListQuerySchema = paginationSchema.extend({
  status: z.enum(['OPEN', 'IN_REVIEW', 'RESOLVED', 'DISMISSED']).optional(),
});

export const auditListQuerySchema = paginationSchema.extend({
  action: z.string().trim().max(80).optional(),
  entityType: z.string().trim().max(80).optional(),
});
