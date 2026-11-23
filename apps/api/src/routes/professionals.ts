import { Router } from 'express';
import {
  createMyException,
  createMyService,
  deleteMyException,
  getMyCalendar,
  getMyProfile,
  getMySchedule,
  getProfessional,
  getProfessionalAvailability,
  getProfessionalServices,
  listMyDocuments,
  listMyExceptions,
  listMyServices,
  listProfessionalReviews,
  listProfessionals,
  nearbyProfessionals,
  saveMySchedule,
  updateMyLocation,
  updateMyProfile,
  updateMyService,
  uploadDocument,
  uploadProfilePhoto,
  weeklyLeaderboard,
} from '../controllers/professionalsController';
import { optionalAuth, requireAuth, requireRole } from '../middlewares/auth';
import { validate } from '../middlewares/validate';
import {
  writeLimiter,
  bookingLimiter,
} from '../middlewares/rateLimit';
import {
  uploadPrivateDocument,
  uploadPublicImage,
} from '../services/storage';
import {
  availabilityExceptionSchema,
  availabilityQuerySchema,
  calendarQuerySchema,
  createServiceSchema,
  listProfessionalsQuerySchema,
  nearbyQuerySchema,
  professionalIdParamsSchema,
  scheduleSchema,
  updateLocationSchema,
  updateProfileSchema,
  updateServiceSchema,
  uploadDocumentSchema,
} from '../validators/professionals';
import { idParamsSchema } from '../validators/common';

const router = Router();

router.get(
  '/',
  optionalAuth,
  validate({ query: listProfessionalsQuerySchema }),
  listProfessionals,
);
router.get(
  '/nearby',
  optionalAuth,
  validate({ query: nearbyQuerySchema }),
  nearbyProfessionals,
);
router.get('/leaderboard/weekly', weeklyLeaderboard);

router.get(
  '/me',
  requireAuth,
  requireRole('PROFESSIONAL'),
  getMyProfile,
);
router.put(
  '/me',
  requireAuth,
  requireRole('PROFESSIONAL'),
  writeLimiter,
  validate({ body: updateProfileSchema }),
  updateMyProfile,
);
router.post(
  '/me/location',
  requireAuth,
  requireRole('PROFESSIONAL'),
  validate({ body: updateLocationSchema }),
  updateMyLocation,
);
router.post(
  '/me/photo',
  requireAuth,
  requireRole('PROFESSIONAL'),
  uploadPublicImage.single('file'),
  uploadProfilePhoto,
);

router.get(
  '/me/services',
  requireAuth,
  requireRole('PROFESSIONAL'),
  listMyServices,
);
router.post(
  '/me/services',
  requireAuth,
  requireRole('PROFESSIONAL'),
  validate({ body: createServiceSchema }),
  createMyService,
);
router.put(
  '/me/services/:serviceId',
  requireAuth,
  requireRole('PROFESSIONAL'),
  validate({ body: updateServiceSchema }),
  updateMyService,
);

router.get(
  '/me/documents',
  requireAuth,
  requireRole('PROFESSIONAL'),
  listMyDocuments,
);
router.post(
  '/me/documents',
  requireAuth,
  requireRole('PROFESSIONAL'),
  uploadPrivateDocument.single('file'),
  validate({ body: uploadDocumentSchema }),
  uploadDocument,
);

router.get(
  '/me/schedule',
  requireAuth,
  requireRole('PROFESSIONAL'),
  getMySchedule,
);
router.put(
  '/me/schedule',
  requireAuth,
  requireRole('PROFESSIONAL'),
  validate({ body: scheduleSchema }),
  saveMySchedule,
);
router.get(
  '/me/exceptions',
  requireAuth,
  requireRole('PROFESSIONAL'),
  listMyExceptions,
);
router.post(
  '/me/exceptions',
  requireAuth,
  requireRole('PROFESSIONAL'),
  validate({ body: availabilityExceptionSchema }),
  createMyException,
);
router.delete(
  '/me/exceptions/:id',
  requireAuth,
  requireRole('PROFESSIONAL'),
  validate({ params: idParamsSchema }),
  deleteMyException,
);
router.get(
  '/me/calendar',
  requireAuth,
  requireRole('PROFESSIONAL'),
  validate({ query: calendarQuerySchema }),
  getMyCalendar,
);

router.get(
  '/:id',
  optionalAuth,
  validate({ params: professionalIdParamsSchema }),
  getProfessional,
);
router.get(
  '/:id/services',
  optionalAuth,
  validate({ params: professionalIdParamsSchema }),
  getProfessionalServices,
);
router.get(
  '/:id/availability',
  optionalAuth,
  bookingLimiter,
  validate({ params: professionalIdParamsSchema, query: availabilityQuerySchema }),
  getProfessionalAvailability,
);
router.get(
  '/:id/reviews',
  optionalAuth,
  validate({ params: professionalIdParamsSchema }),
  listProfessionalReviews,
);

export default router;
