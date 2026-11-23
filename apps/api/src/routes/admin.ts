import { Router } from 'express';
import {
  createCategory,
  createContent,
  dashboard,
  deleteContent,
  downloadDocument,
  getProfessionalDetail,
  listAuditLogs,
  listContent,
  listDocumentsForProfessional,
  listPendingProfessionals,
  listProfessionalsAdmin,
  listReportedReviews,
  listReports,
  listServiceAreas,
  listUsers,
  moderateReview,
  resolveReport,
  reviewDocument,
  setUserStatus,
  setVerification,
  updateCategory,
  updateContent,
  updateServiceArea,
} from '../controllers/adminController';
import { requireAuth, requireRole } from '../middlewares/auth';
import { validate } from '../middlewares/validate';
import {
  adminListQuerySchema,
  auditListQuerySchema,
  categoryCreateSchema,
  categoryUpdateSchema,
  contentCreateSchema,
  contentUpdateSchema,
  documentReviewSchema,
  reportListQuerySchema,
  resolveReportSchema,
  reviewModerationSchema,
  serviceAreaUpdateSchema,
  userStatusSchema,
  verificationSchema,
} from '../validators/admin';
import { idParamsSchema } from '../validators/common';

const router = Router();

router.use(requireAuth, requireRole('ADMIN'));

router.get('/dashboard', dashboard);
router.get('/stats', dashboard);

router.get(
  '/professionals/pending',
  validate({ query: adminListQuerySchema }),
  listPendingProfessionals,
);
router.get(
  '/professionals',
  validate({ query: adminListQuerySchema }),
  listProfessionalsAdmin,
);
router.get(
  '/professionals/:id',
  validate({ params: idParamsSchema }),
  getProfessionalDetail,
);
router.patch(
  '/professionals/:id/verification',
  requireRole('ADMIN'),
  validate({ params: idParamsSchema, body: verificationSchema }),
  setVerification,
);
router.get(
  '/professionals/:id/documents',
  validate({ params: idParamsSchema }),
  listDocumentsForProfessional,
);

router.get(
  '/documents/:id/file',
  validate({ params: idParamsSchema }),
  downloadDocument,
);
router.patch(
  '/documents/:id',
  validate({ params: idParamsSchema, body: documentReviewSchema }),
  reviewDocument,
);

router.get(
  '/users',
  validate({ query: adminListQuerySchema }),
  listUsers,
);
router.patch(
  '/users/:id/status',
  validate({ params: idParamsSchema, body: userStatusSchema }),
  setUserStatus,
);

router.get(
  '/reports',
  validate({ query: reportListQuerySchema }),
  listReports,
);
router.patch(
  '/reports/:id',
  validate({ params: idParamsSchema, body: resolveReportSchema }),
  resolveReport,
);

router.get('/reviews', listReportedReviews);
router.patch(
  '/reviews/:id',
  validate({ params: idParamsSchema, body: reviewModerationSchema }),
  moderateReview,
);

router.post(
  '/service-categories',
  validate({ body: categoryCreateSchema }),
  createCategory,
);
router.put(
  '/service-categories/:id',
  validate({ params: idParamsSchema, body: categoryUpdateSchema }),
  updateCategory,
);

router.get('/service-areas', listServiceAreas);
router.put(
  '/service-areas/:id',
  validate({ params: idParamsSchema, body: serviceAreaUpdateSchema }),
  updateServiceArea,
);

router.get('/content', listContent);
router.post(
  '/content',
  validate({ body: contentCreateSchema }),
  createContent,
);
router.patch(
  '/content/:id',
  validate({ params: idParamsSchema, body: contentUpdateSchema }),
  updateContent,
);
router.delete(
  '/content/:id',
  validate({ params: idParamsSchema }),
  deleteContent,
);

router.get(
  '/audit-logs',
  validate({ query: auditListQuerySchema }),
  listAuditLogs,
);

export default router;
