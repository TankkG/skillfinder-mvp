import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';
import { env } from './config/env';
import { requestId } from './middlewares/requestId';
import { httpMetricsMiddleware } from './monitoring/httpMetrics';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler';
import { generalLimiter } from './middlewares/rateLimit';
import { publicDir } from './services/storage';
import { openapi } from './docs/openapi';
import authRoutes from './routes/auth';
import professionalRoutes from './routes/professionals';
import bookingRoutes from './routes/bookings';
import reviewRoutes from './routes/reviews';
import notificationRoutes from './routes/notifications';
import favoriteRoutes from './routes/favorites';
import reportRoutes from './routes/reports';
import catalogRoutes from './routes/catalog';
import adminRoutes from './routes/admin';
import systemRoutes from './routes/system';

const app = express();

app.disable('x-powered-by');
app.set('trust proxy', 1);

app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }),
);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, true);
        return;
      }
      if (
        env.NODE_ENV !== 'production' ||
        env.allowedOrigins.includes(origin)
      ) {
        callback(null, true);
        return;
      }
      callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key', 'X-Request-Id'],
  }),
);

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(requestId);
app.use(httpMetricsMiddleware);

if (!env.isTest) {
  app.use(
    morgan(env.isProduction ? 'combined' : 'dev', {
      skip: (req) => req.path === '/api/health',
    }),
  );
}

app.use('/uploads/public', express.static(publicDir, { maxAge: '1d' }));

app.use('/api', generalLimiter);

app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openapi));
app.get('/api/docs.json', (_req, res) => res.json(openapi));

app.use('/api', systemRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/professionals', professionalRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/favorites', favoriteRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api', catalogRoutes);
app.use('/api/admin', adminRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
