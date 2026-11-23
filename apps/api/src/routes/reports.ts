import { Router } from 'express';
import { z } from 'zod';
import { createReport } from '../controllers/reportsController';
import { requireAuth } from '../middlewares/auth';
import { validate } from '../middlewares/validate';

const router = Router();

const reportSchema = z.object({
  targetType: z.enum(['PROFILE', 'REVIEW', 'BOOKING', 'USER', 'OTHER']),
  targetId: z.string().trim().min(1).max(120),
  reason: z.string().trim().min(3).max(160),
  description: z.string().trim().max(1000).optional().default(''),
});

router.post(
  '/',
  requireAuth,
  validate({ body: reportSchema }),
  createReport,
);

export default router;
