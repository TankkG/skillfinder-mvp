import { Router } from 'express';
import {
  acceptBookingHandler,
  bookingsOverview,
  cancelBookingHandler,
  completeBookingHandler,
  createBookingHandler,
  getBooking,
  listBookingMessages,
  listMyBookings,
  noShowHandler,
  rejectBookingHandler,
  sendBookingMessage,
  startBookingHandler,
} from '../controllers/bookingsController';
import { createReviewHandler } from '../controllers/reviewsController';
import { requireAuth, requireRole } from '../middlewares/auth';
import { validate } from '../middlewares/validate';
import { bookingLimiter, writeLimiter } from '../middlewares/rateLimit';
import {
  bookingIdParamsSchema,
  cancelBookingSchema,
  createBookingSchema,
  createReviewSchema,
  listBookingsQuerySchema,
  rejectBookingSchema,
  sendBookingMessageSchema,
} from '../validators/bookings';

const router = Router();

router.post(
  '/',
  requireAuth,
  requireRole('CLIENT'),
  bookingLimiter,
  validate({ body: createBookingSchema }),
  createBookingHandler,
);
router.get(
  '/me',
  requireAuth,
  validate({ query: listBookingsQuerySchema }),
  listMyBookings,
);
router.get(
  '/overview',
  requireAuth,
  requireRole('PROFESSIONAL'),
  bookingsOverview,
);
router.get(
  '/:id',
  requireAuth,
  validate({ params: bookingIdParamsSchema }),
  getBooking,
);
router.get(
  '/:id/messages',
  requireAuth,
  validate({ params: bookingIdParamsSchema }),
  listBookingMessages,
);
router.post(
  '/:id/messages',
  requireAuth,
  writeLimiter,
  validate({ params: bookingIdParamsSchema, body: sendBookingMessageSchema }),
  sendBookingMessage,
);
router.patch(
  '/:id/accept',
  requireAuth,
  requireRole('PROFESSIONAL'),
  validate({ params: bookingIdParamsSchema }),
  acceptBookingHandler,
);
router.patch(
  '/:id/reject',
  requireAuth,
  requireRole('PROFESSIONAL'),
  validate({ params: bookingIdParamsSchema, body: rejectBookingSchema }),
  rejectBookingHandler,
);
router.patch(
  '/:id/cancel',
  requireAuth,
  writeLimiter,
  validate({ params: bookingIdParamsSchema, body: cancelBookingSchema }),
  cancelBookingHandler,
);
router.patch(
  '/:id/start',
  requireAuth,
  requireRole('PROFESSIONAL'),
  validate({ params: bookingIdParamsSchema }),
  startBookingHandler,
);
router.patch(
  '/:id/complete',
  requireAuth,
  requireRole('PROFESSIONAL'),
  validate({ params: bookingIdParamsSchema }),
  completeBookingHandler,
);
router.patch(
  '/:id/no-show',
  requireAuth,
  requireRole('PROFESSIONAL'),
  validate({ params: bookingIdParamsSchema, body: cancelBookingSchema }),
  noShowHandler,
);
router.post(
  '/:id/reviews',
  requireAuth,
  validate({ params: bookingIdParamsSchema, body: createReviewSchema }),
  createReviewHandler,
);

export default router;
