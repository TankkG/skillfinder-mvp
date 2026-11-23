import { Router } from 'express';
import { reportReview } from '../controllers/professionalsController';
import { requireAuth } from '../middlewares/auth';
import { validate } from '../middlewares/validate';
import { idParamsSchema } from '../validators/common';

const router = Router();

router.post(
  '/:id/report',
  requireAuth,
  validate({ params: idParamsSchema }),
  reportReview,
);

export default router;
