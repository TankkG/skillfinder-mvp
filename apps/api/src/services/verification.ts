import crypto from 'node:crypto';
import { DateTime } from 'luxon';
import {
  VERIFICATION_CHANNELS,
  type VerificationChannel,
} from '@skillfinder/shared';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { User, VerificationCode } from '../models';
import { ApiError } from '../utils/errors';
import { notifyUser } from './notifications';

const CODE_TTL_MINUTES = 10;
const MAX_ATTEMPTS = 5;

const hashCode = (userId: string, channel: VerificationChannel, code: string) =>
  crypto
    .createHash('sha256')
    .update(`${userId}:${channel}:${code}:${env.JWT_ACCESS_SECRET}`)
    .digest('hex');

const generateCode = (): string =>
  String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');

const targetFor = (
  user: { email: string; phone: string },
  channel: VerificationChannel,
): string => (channel === VERIFICATION_CHANNELS.EMAIL ? user.email : user.phone);

export const requestVerificationCode = async (input: {
  userId: string;
  channel: VerificationChannel;
}) => {
  const user = await User.findById(input.userId);
  if (!user) throw ApiError.notFound('La cuenta no existe.');

  const verifiedAt =
    input.channel === VERIFICATION_CHANNELS.EMAIL
      ? user.emailVerifiedAt
      : user.phoneVerifiedAt;
  if (verifiedAt) {
    throw ApiError.conflict(
      input.channel === VERIFICATION_CHANNELS.EMAIL
        ? 'El correo ya esta verificado.'
        : 'El telefono ya esta verificado.',
    );
  }

  const code = generateCode();
  const expiresAt = DateTime.now().plus({ minutes: CODE_TTL_MINUTES }).toJSDate();

  await VerificationCode.updateMany(
    {
      userId: user._id,
      channel: input.channel,
      consumedAt: null,
    },
    { $set: { consumedAt: new Date() } },
  );

  await VerificationCode.create({
    userId: user._id,
    channel: input.channel,
    codeHash: hashCode(user.id, input.channel, code),
    expiresAt,
  });

  const target = targetFor(user, input.channel);
  await notifyUser({
    userId: user.id,
    type: 'VERIFICATION_CODE_REQUESTED',
    title: 'Codigo de verificacion',
    message: `Enviamos un codigo de verificacion a ${target}. Vence en ${CODE_TTL_MINUTES} minutos.`,
    deliveryMessage: `Tu codigo de verificacion de SkillFinder es ${code}. Vence en ${CODE_TTL_MINUTES} minutos.`,
  });

  if (!env.isProduction) {
    logger.info(`[verification:${input.channel}] ${target} :: ${code}`);
  }

  return {
    channel: input.channel,
    target,
    expiresAt: expiresAt.toISOString(),
    ...(env.isProduction ? {} : { devCode: code }),
  };
};

export const confirmVerificationCode = async (input: {
  userId: string;
  channel: VerificationChannel;
  code: string;
}) => {
  const record = await VerificationCode.findOne({
    userId: input.userId,
    channel: input.channel,
    consumedAt: null,
  }).sort({ createdAt: -1 });

  if (!record || record.expiresAt.getTime() <= Date.now()) {
    throw ApiError.unprocessable(
      'El codigo expiro o no existe. Solicita uno nuevo.',
    );
  }
  if (record.attempts >= MAX_ATTEMPTS) {
    throw ApiError.tooManyRequests(
      'Se supero el numero de intentos. Solicita un codigo nuevo.',
    );
  }

  const expected = Buffer.from(record.codeHash, 'hex');
  const received = Buffer.from(
    hashCode(input.userId, input.channel, input.code.trim()),
    'hex',
  );
  const matches =
    expected.length === received.length &&
    crypto.timingSafeEqual(expected, received);

  if (!matches) {
    record.attempts += 1;
    await record.save();
    throw ApiError.unprocessable('El codigo ingresado no es correcto.');
  }

  record.consumedAt = new Date();
  await record.save();

  const field =
    input.channel === VERIFICATION_CHANNELS.EMAIL
      ? 'emailVerifiedAt'
      : 'phoneVerifiedAt';
  const user = await User.findByIdAndUpdate(
    input.userId,
    { $set: { [field]: new Date() } },
    { new: true },
  );
  if (!user) throw ApiError.notFound('La cuenta no existe.');

  return user;
};
