import path from 'node:path';
import dotenv from 'dotenv';
import { z } from 'zod';

// Prioriza el .env de la raiz para compartir una sola configuracion con Grafana.
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });
// Si no existe el .env raiz, permite usar apps/api/.env como alternativa.
dotenv.config();

const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  API_PORT: z.coerce.number().int().positive().default(3000),
  METRICS_PORT: z.coerce.number().int().positive().default(9100),
  METRICS_BIND_ADDRESS: z.string().ip().default('0.0.0.0'),
  GRAFANA_METRICS_REFRESH_MS: z.coerce.number().int().min(5000).default(30000),
  GRAFANA_MIN_DISTRICT_RECORDS: z.coerce.number().int().min(1).default(5),
  API_BASE_URL: z.string().default('http://localhost:3000/api'),
  MONGODB_URI: z.string().default('mongodb://127.0.0.1:27017/skillfinder'),
  JWT_ACCESS_SECRET: z.string().min(8).default('dev-access-secret-change-me'),
  JWT_REFRESH_SECRET: z.string().min(8).default('dev-refresh-secret-change-me'),
  ACCESS_TOKEN_EXPIRES_IN: z.string().default('15m'),
  REFRESH_TOKEN_EXPIRES_IN: z.string().default('30d'),
  WEB_ALLOWED_ORIGINS: z
    .string()
    .default('http://localhost:8081,http://localhost:19006'),
  ADMIN_NAME: z.string().default('Administrador SkillFinder'),
  ADMIN_EMAIL: z.string().email().default('admin@skillfinder.bo'),
  ADMIN_PASSWORD: z.string().min(8).default('Admin12345!'),
  AUTO_APPROVE_PROFESSIONALS: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
  MAP_PROVIDER: z.string().default('openstreetmap'),
  MAP_API_KEY: z.string().optional().default(''),
  FILE_STORAGE_PROVIDER: z.enum(['local', 's3']).default('local'),
  FILE_STORAGE_BUCKET: z.string().optional().default(''),
  UPLOAD_DIR: z.string().default('uploads'),
  EMAIL_PROVIDER: z.string().default('console'),
  EMAIL_API_KEY: z.string().optional().default(''),
  EMAIL_FROM: z.string().default('no-reply@skillfinder.bo'),
  PUSH_PROVIDER: z.string().default('console'),
  PUSH_CREDENTIALS: z.string().optional().default(''),
  DEFAULT_TIMEZONE: z.string().default('America/La_Paz'),
  PILOT_SERVICE_AREA_CODE: z.string().default('CBBA-D2'),
  PILOT_SERVICE_AREA_ID: z.string().optional().default(''),
  PILOT_ENFORCE_BOUNDARY: z
    .enum(['true', 'false'])
    .default('true')
    .transform((value) => value === 'true'),
  BOOKING_SLOT_MINUTES: z.coerce.number().int().positive().default(15),
  BOOKING_HOLD_MINUTES: z.coerce.number().int().positive().default(15),
  BOOKING_MIN_ADVANCE_MINUTES: z.coerce.number().int().min(0).default(60),
  BOOKING_MAX_FUTURE_DAYS: z.coerce.number().int().positive().default(60),
  SERVICE_BUFFER_MINUTES: z.coerce.number().int().min(0).default(0),
  EXPIRATION_JOB_INTERVAL_MS: z.coerce.number().int().positive().default(60000),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error(
    'Configuracion de entorno invalida:',
    parsed.error.flatten().fieldErrors,
  );
  process.exit(1);
}

export const env = {
  ...parsed.data,
  isProduction: parsed.data.NODE_ENV === 'production',
  isTest: parsed.data.NODE_ENV === 'test',
  allowedOrigins: parsed.data.WEB_ALLOWED_ORIGINS.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  uploadDir: path.isAbsolute(parsed.data.UPLOAD_DIR)
    ? parsed.data.UPLOAD_DIR
    : path.resolve(process.cwd(), parsed.data.UPLOAD_DIR),
};

export type Env = typeof env;
