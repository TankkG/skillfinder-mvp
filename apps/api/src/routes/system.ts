import { Router } from 'express';
import {
  health,
  helpFaq,
  publicContent,
} from '../controllers/systemController';

const router = Router();

router.get('/health', health);
router.get('/help/faq', helpFaq);
router.get('/content/:key', publicContent);

export default router;
