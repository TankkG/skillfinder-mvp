import type { Types } from 'mongoose';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { Notification, User } from '../models';

export interface NotifyInput {
  userId: Types.ObjectId | string;
  type: string;
  title: string;
  message: string;
  deliveryMessage?: string;
  entityType?: string;
  entityId?: string;
}

/**
 * Adaptador de correo. En desarrollo (proveedor `console`) solo registra el
 * evento; en produccion debe sustituirse por un proveedor real.
 */
const sendEmail = async (to: string, subject: string, body: string) => {
  if (env.EMAIL_PROVIDER === 'console') {
    logger.info(`[email:console] ${to} :: ${subject} :: ${body}`);
    return 'SKIPPED' as const;
  }
  logger.info(`[email:${env.EMAIL_PROVIDER}] envio pendiente de integracion`, {
    to,
    subject,
  });
  return 'PENDING' as const;
};

const sendPush = async (userId: string, title: string, body: string) => {
  if (env.PUSH_PROVIDER === 'console') {
    logger.info(`[push:console] ${userId} :: ${title} :: ${body}`);
    return 'SKIPPED' as const;
  }
  logger.info(`[push:${env.PUSH_PROVIDER}] envio pendiente de integracion`, {
    userId,
    title,
  });
  return 'PENDING' as const;
};

export const notifyUser = async (input: NotifyInput): Promise<void> => {
  try {
    let deliveryStatus: 'DELIVERED' | 'SKIPPED' | 'PENDING' = 'DELIVERED';

    if (!input.message.includes('token')) {
      const user = await User.findById(input.userId).select('email name');
      if (user) {
        const emailResult = await sendEmail(
          user.email,
          input.title,
          input.deliveryMessage ?? input.message,
        );
        if (emailResult !== 'SKIPPED') deliveryStatus = emailResult;
      }
      const pushResult = await sendPush(
        String(input.userId),
        input.title,
        input.deliveryMessage ?? input.message,
      );
      if (pushResult !== 'SKIPPED' && deliveryStatus === 'DELIVERED') {
        deliveryStatus = pushResult;
      }
    }

    await Notification.create({
      userId: input.userId,
      type: input.type,
      title: input.title,
      message: input.message,
      entityType: input.entityType ?? null,
      entityId: input.entityId ?? null,
      deliveryStatus,
    });
  } catch (error) {
    logger.warn('No se pudo crear la notificacion', {
      type: input.type,
      error: (error as Error).message,
    });
  }
};

export const notifyMany = async (inputs: NotifyInput[]): Promise<void> => {
  await Promise.all(inputs.map((input) => notifyUser(input)));
};
