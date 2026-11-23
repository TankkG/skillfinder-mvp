import mongoose from 'mongoose';
import { env } from '../config/env';
import { logger } from '../config/logger';

mongoose.set('strictQuery', true);

export const connectDatabase = async (uri = env.MONGODB_URI): Promise<void> => {
  if (mongoose.connection.readyState === 1) {
    return;
  }
  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 15000,
    autoIndex: env.NODE_ENV !== 'production',
  });
  logger.info(`MongoDB conectado (${mongoose.connection.name})`);
};

export const disconnectDatabase = async (): Promise<void> => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
};

export const supportsTransactions = async (): Promise<boolean> => {
  try {
    const admin = mongoose.connection.db?.admin();
    if (!admin) return false;
    const hello = await admin.command({ hello: 1 });
    return Boolean(hello.setName);
  } catch {
    return false;
  }
};

export { mongoose };
