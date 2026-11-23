import { Router } from 'express';
import {
  listMyNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '../controllers/notificationsController';
import { requireAuth } from '../middlewares/auth';
import { validate } from '../middlewares/validate';
import { idParamsSchema } from '../validators/common';

const router = Router();

router.get('/me', requireAuth, listMyNotifications);
router.patch('/read-all', requireAuth, markAllNotificationsRead);
router.patch(
  '/:id/read',
  requireAuth,
  validate({ params: idParamsSchema }),
  markNotificationRead,
);

export default router;
