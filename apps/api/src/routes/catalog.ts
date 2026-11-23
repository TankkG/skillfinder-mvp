import { Router } from 'express';
import {
  activeServiceArea,
  listCategories,
  listServiceAreasPublic,
} from '../controllers/catalogController';
import { optionalAuth } from '../middlewares/auth';

const router = Router();

router.get('/service-categories', optionalAuth, listCategories);
router.get('/service-areas/active', activeServiceArea);
router.get('/service-areas', listServiceAreasPublic);

export default router;
