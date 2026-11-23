import { createServer } from 'node:http';
import app from './app';
import { env } from './config/env';
import { logger } from './config/logger';
import { connectDatabase, disconnectDatabase } from './database/connect';
import { startExpirationJob } from './jobs/expireBookings';
import { startMetricsCollector } from './monitoring/collector';
import { renderMetrics } from './monitoring/registry';

const bootstrap = async () => {
  await connectDatabase();

  const server = app.listen(env.API_PORT, () => {
    logger.info(`SkillFinder API escuchando en http://localhost:${env.API_PORT}`);
    logger.info(`Documentacion: http://localhost:${env.API_PORT}/api/docs`);
  });

  const stopExpiration = startExpirationJob();
  const stopMetricsCollector = startMetricsCollector();
  const metricsServer = createServer((req, res) => {
    if (req.method !== 'GET' || req.url?.split('?')[0] !== '/metrics') {
      res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
      res.end('Not found');
      return;
    }
    res.writeHead(200, {
      'content-type': 'text/plain; version=0.0.4; charset=utf-8',
      'cache-control': 'no-store',
    });
    res.end(renderMetrics());
  });
  metricsServer.listen(env.METRICS_PORT, env.METRICS_BIND_ADDRESS, () => {
    logger.info(`Metricas Prometheus disponibles en el puerto interno ${env.METRICS_PORT}`);
  });

  const shutdown = async (signal: string) => {
    logger.info(`Recibida senal ${signal}. Cerrando servicio...`);
    stopExpiration();
    stopMetricsCollector();
    metricsServer.close();
    server.close(async () => {
      await disconnectDatabase();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10000).unref();
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
};

bootstrap().catch((error) => {
  logger.error('No se pudo iniciar la API', {
    message: (error as Error).message,
    stack: (error as Error).stack,
  });
  process.exit(1);
});
