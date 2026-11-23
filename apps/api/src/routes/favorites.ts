import { Router } from 'express';
import { z } from 'zod';
import {
  addFavorite,
  listFavorites,
  removeFavorite,
} from '../controllers/favoritesController';
import { requireAuth, requireRole } from '../middlewares/auth';
import { validate } from '../middlewares/validate';
import { objectId } from '../validators/common';

const router = Router();
const paramsSchema = z.object({ professionalId: objectId });

router.use(requireAuth, requireRole('CLIENT'));
router.get('/', listFavorites);
router.post('/:professionalId', validate({ params: paramsSchema }), addFavorite);
router.delete(
  '/:professionalId',
  validate({ params: paramsSchema }),
  removeFavorite,
);

export default router;
