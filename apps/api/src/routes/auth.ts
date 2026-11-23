import { Router } from 'express';
import {
  changePassword,
  confirmAccountVerification,
  forgotPassword,
  login,
  logout,
  me,
  refresh,
  registerClient,
  registerProfessional,
  requestAccountVerification,
  resetPassword,
} from '../controllers/authController';
import { requireAuth } from '../middlewares/auth';
import { validate } from '../middlewares/validate';
import {
  authLimiter,
  registerLimiter,
} from '../middlewares/rateLimit';
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  logoutSchema,
  refreshSchema,
  registerClientSchema,
  registerProfessionalSchema,
  resetPasswordSchema,
  verificationConfirmSchema,
  verificationRequestSchema,
} from '../validators/auth';

const router = Router();

router.post(
  '/register/client',
  registerLimiter,
  validate({ body: registerClientSchema }),
  registerClient,
);
router.post(
  '/register/professional',
  registerLimiter,
  validate({ body: registerProfessionalSchema }),
  registerProfessional,
);
router.post('/login', authLimiter, validate({ body: loginSchema }), login);
router.post('/refresh', authLimiter, validate({ body: refreshSchema }), refresh);
router.post('/logout', validate({ body: logoutSchema }), logout);
router.post(
  '/forgot-password',
  authLimiter,
  validate({ body: forgotPasswordSchema }),
  forgotPassword,
);
router.post(
  '/reset-password',
  authLimiter,
  validate({ body: resetPasswordSchema }),
  resetPassword,
);
router.post(
  '/verification/request',
  requireAuth,
  authLimiter,
  validate({ body: verificationRequestSchema }),
  requestAccountVerification,
);
router.post(
  '/verification/confirm',
  requireAuth,
  authLimiter,
  validate({ body: verificationConfirmSchema }),
  confirmAccountVerification,
);
router.get('/me', requireAuth, me);
router.post(
  '/change-password',
  requireAuth,
  validate({ body: changePasswordSchema }),
  changePassword,
);

export default router;
