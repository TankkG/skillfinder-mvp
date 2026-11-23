import { env } from '../config/env';
import { logger } from '../config/logger';
import { expirePendingBookings } from '../services/bookings';
import { sendDueBookingReminders } from '../services/reminders';

export const startExpirationJob = (): (() => void) => {
  const run = async () => {
    try {
      const [expired, reminders] = await Promise.all([
        expirePendingBookings(),
        sendDueBookingReminders(),
      ]);
      if (expired > 0) {
        logger.info(`Solicitudes expiradas y bloqueos liberados: ${expired}`);
      }
      if (reminders > 0) {
        logger.info(`Reservas recordadas: ${reminders}`);
      }
    } catch (error) {
      logger.error('Fallo el proceso de expiracion de solicitudes', {
        message: (error as Error).message,
      });
    }
  };

  const timer = setInterval(run, env.EXPIRATION_JOB_INTERVAL_MS);
  timer.unref();
  void run();

  return () => clearInterval(timer);
};
