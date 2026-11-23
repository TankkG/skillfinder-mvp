import { Types } from 'mongoose';
import jwt from 'jsonwebtoken';
import type { Request } from 'express';
import type { Role } from '@skillfinder/shared';
import { USER_STATUSES, VERIFICATION_STATUSES } from '@skillfinder/shared';
import {
  PasswordResetToken,
  ProfessionalProfile,
  Session,
  User,
  WeeklySchedule,
} from '../models';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/errors';
import {
  hashPassword,
  isStrongPassword,
  PASSWORD_POLICY_MESSAGE,
  verifyPassword,
} from '../utils/password';
import {
  hashToken,
  randomToken,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from '../utils/jwt';
import { mapProfessional, mapSchedule, mapUser } from '../utils/mappers';
import { toGeoPoint } from '../utils/geo';
import { resolveServiceAreaIdForPoint } from '../services/serviceAreas';
import { notifyUser } from '../services/notifications';
import {
  confirmVerificationCode,
  requestVerificationCode,
} from '../services/verification';
import { writeAuditLog } from '../utils/audit';
import type { z } from 'zod';
import type {
  loginSchema,
  registerClientSchema,
  registerProfessionalSchema,
  resetPasswordSchema,
  verificationConfirmSchema,
  verificationRequestSchema,
} from '../validators/auth';

const buildTokens = async (req: Request, userId: string) => {
  const sessionId = new Types.ObjectId();
  const user = await User.findById(userId);
  if (!user) throw ApiError.unauthorized('La cuenta no existe.');

  const accessToken = signAccessToken({
    sub: user.id,
    role: user.role as Role,
    status: user.status as Express.AuthUser['status'],
    email: user.email,
    name: user.name,
  });
  const refreshToken = signRefreshToken(user.id, sessionId.toString());
  const decoded = jwt.decode(refreshToken) as { exp?: number } | null;

  await Session.create({
    _id: sessionId,
    userId: user._id,
    tokenHash: hashToken(refreshToken),
    expiresAt: decoded?.exp
      ? new Date(decoded.exp * 1000)
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    ipAddress: req.ip ?? null,
    userAgent: req.get('user-agent')?.slice(0, 300) ?? null,
  });

  return { accessToken, refreshToken };
};

const professionalPayload = async (userId: string) => {
  const profile = await ProfessionalProfile.findOne({ userId });
  if (!profile) return null;
  const user = await User.findById(userId).select('phone email');
  return mapProfessional(profile, {
    phone: user?.phone,
    email: user?.email,
  });
};

const defaultSchedule = [
  { dayOfWeek: 1, intervals: [{ start: '08:00', end: '19:00' }], breaks: [{ start: '12:00', end: '13:00' }], active: true },
  { dayOfWeek: 2, intervals: [{ start: '08:00', end: '19:00' }], breaks: [{ start: '12:00', end: '13:00' }], active: true },
  { dayOfWeek: 3, intervals: [{ start: '08:00', end: '19:00' }], breaks: [{ start: '12:00', end: '13:00' }], active: true },
  { dayOfWeek: 4, intervals: [{ start: '08:00', end: '19:00' }], breaks: [{ start: '12:00', end: '13:00' }], active: true },
  { dayOfWeek: 5, intervals: [{ start: '08:00', end: '19:00' }], breaks: [{ start: '12:00', end: '13:00' }], active: true },
  { dayOfWeek: 6, intervals: [{ start: '08:00', end: '13:00' }], breaks: [], active: true },
] as const;

export const registerClient = asyncHandler(async (req, res) => {
  const body = req.body as z.infer<typeof registerClientSchema>;
  if (!isStrongPassword(body.password)) {
    throw ApiError.badRequest(PASSWORD_POLICY_MESSAGE);
  }
  const existing = await User.findOne({ emailNormalized: body.email });
  if (existing) {
    throw ApiError.conflict('Ya existe una cuenta con ese correo electronico.');
  }

  const passwordHash = await hashPassword(body.password);
  const user = await User.create({
    name: body.name,
    email: body.email,
    emailNormalized: body.email,
    phone: body.phone,
    passwordHash,
    role: 'CLIENT',
    status: USER_STATUSES.ACTIVE,
    termsAcceptedAt: new Date(),
    privacyAcceptedAt: new Date(),
  });

  const tokens = await buildTokens(req, user.id);

  await notifyUser({
    userId: user.id,
    type: 'ACCOUNT_CREATED',
    title: 'Bienvenido a SkillFinder',
    message: `Hola ${user.name}, tu cuenta de cliente fue creada correctamente.`,
  });

  await writeAuditLog(
    {
      actorId: user.id,
      action: 'AUTH_REGISTER_CLIENT',
      entityType: 'USER',
      entityId: user.id,
    },
    req,
  );

  res.status(201).json({
    user: mapUser(user),
    ...tokens,
    professionalProfile: null,
  });
});

export const registerProfessional = asyncHandler(async (req, res) => {
  const body = req.body as z.infer<typeof registerProfessionalSchema>;
  if (!isStrongPassword(body.password)) {
    throw ApiError.badRequest(PASSWORD_POLICY_MESSAGE);
  }
  const existing = await User.findOne({ emailNormalized: body.email });
  if (existing) {
    throw ApiError.conflict('Ya existe una cuenta con ese correo electronico.');
  }

  let serviceAreaId: string | null = null;
  try {
    serviceAreaId = await resolveServiceAreaIdForPoint(
      body.location.longitude,
      body.location.latitude,
    );
  } catch (error) {
    throw ApiError.unprocessable((error as Error).message);
  }

  const passwordHash = await hashPassword(body.password);
  const user = await User.create({
    name: body.name,
    email: body.email,
    emailNormalized: body.email,
    phone: body.phone,
    passwordHash,
    role: 'PROFESSIONAL',
    status: USER_STATUSES.ACTIVE,
    termsAcceptedAt: new Date(),
    privacyAcceptedAt: new Date(),
  });

  const autoApprove =
    env.AUTO_APPROVE_PROFESSIONALS && !env.isProduction;

  try {
    await ProfessionalProfile.create({
      userId: user._id,
      displayName: body.name,
      businessName: body.businessName,
      description: body.description,
      categories: body.categories,
      specialties: body.specialties,
      addressText: body.addressText,
      location: toGeoPoint(body.location),
      serviceAreaId: serviceAreaId ? new Types.ObjectId(serviceAreaId) : null,
      verificationStatus: autoApprove
        ? VERIFICATION_STATUSES.APPROVED
        : VERIFICATION_STATUSES.PENDING_VERIFICATION,
      isVisible: autoApprove,
      approvedAt: autoApprove ? new Date() : null,
      offersHomeService: body.offersHomeService,
    });

    const days = body.weeklySchedule?.length
      ? body.weeklySchedule
      : defaultSchedule;

    await Promise.all(
      days.map((day) =>
        WeeklySchedule.findOneAndUpdate(
          { professionalId: user._id, dayOfWeek: day.dayOfWeek },
          {
            $set: {
              intervals: day.intervals,
              breaks: day.breaks,
              active: day.active,
              timezone: env.DEFAULT_TIMEZONE,
            },
          },
          { upsert: true, new: true, setDefaultsOnInsert: true },
        ),
      ),
    );
  } catch (error) {
    await Promise.all([
      ProfessionalProfile.deleteOne({ userId: user._id }),
      WeeklySchedule.deleteMany({ professionalId: user._id }),
      User.deleteOne({ _id: user._id }),
    ]);
    throw error;
  }

  const tokens = await buildTokens(req, user.id);

  await notifyUser({
    userId: user.id,
    type: 'ACCOUNT_CREATED',
    title: 'Registro recibido',
    message: autoApprove
      ? 'Tu perfil profesional fue creado y ya esta visible para los clientes.'
      : 'Tu perfil profesional fue creado y queda pendiente de verificacion. Completa tus documentos para aparecer en el mapa.',
  });

  await writeAuditLog(
    {
      actorId: user.id,
      action: 'AUTH_REGISTER_PROFESSIONAL',
      entityType: 'USER',
      entityId: user.id,
    },
    req,
  );

  res.status(201).json({
    user: mapUser(user),
    ...tokens,
    professionalProfile: await professionalPayload(user.id),
  });
});

export const login = asyncHandler(async (req, res) => {
  const body = req.body as z.infer<typeof loginSchema>;
  const user = await User.findOne({ emailNormalized: body.email }).select(
    '+passwordHash',
  );

  if (!user) {
    throw ApiError.unauthorized('Correo o contrasena incorrectos.');
  }
  if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
    throw ApiError.tooManyRequests(
      'La cuenta esta temporalmente bloqueada por intentos fallidos. Intenta mas tarde.',
    );
  }
  if (
    user.status === USER_STATUSES.SUSPENDED ||
    user.status === USER_STATUSES.BLOCKED
  ) {
    throw ApiError.forbidden('La cuenta esta suspendida o bloqueada.');
  }

  const valid = await verifyPassword(body.password, user.passwordHash);
  if (!valid) {
    user.failedLoginAttempts += 1;
    if (user.failedLoginAttempts >= 5) {
      user.lockedUntil = new Date(Date.now() + 15 * 60 * 1000);
      user.failedLoginAttempts = 0;
    }
    await user.save();
    throw ApiError.unauthorized('Correo o contrasena incorrectos.');
  }

  user.failedLoginAttempts = 0;
  user.lockedUntil = null;
  user.lastLoginAt = new Date();
  await user.save();

  const tokens = await buildTokens(req, user.id);

  await writeAuditLog(
    {
      actorId: user.id,
      action: 'AUTH_LOGIN',
      entityType: 'USER',
      entityId: user.id,
    },
    req,
  );

  res.json({
    user: mapUser(user),
    ...tokens,
    professionalProfile:
      user.role === 'PROFESSIONAL'
        ? await professionalPayload(user.id)
        : null,
  });
});

export const refresh = asyncHandler(async (req, res) => {
  const body = req.body as { refreshToken: string };
  let payload;
  try {
    payload = verifyRefreshToken(body.refreshToken);
  } catch {
    throw ApiError.unauthorized('Token de renovacion invalido o expirado.');
  }

  const session = await Session.findById(payload.jti);
  if (
    !session ||
    session.revokedAt ||
    session.expiresAt.getTime() <= Date.now() ||
    session.tokenHash !== hashToken(body.refreshToken)
  ) {
    throw ApiError.unauthorized('La sesion ya no es valida.');
  }

  const user = await User.findById(payload.sub);
  if (!user) throw ApiError.unauthorized('La cuenta no existe.');
  if (
    user.status === USER_STATUSES.SUSPENDED ||
    user.status === USER_STATUSES.BLOCKED
  ) {
    throw ApiError.forbidden('La cuenta esta suspendida o bloqueada.');
  }

  session.revokedAt = new Date();
  await session.save();

  const tokens = await buildTokens(req, user.id);

  res.json({
    user: mapUser(user),
    ...tokens,
    professionalProfile:
      user.role === 'PROFESSIONAL'
        ? await professionalPayload(user.id)
        : null,
  });
});

export const logout = asyncHandler(async (req, res) => {
  const body = req.body as { refreshToken?: string };
  if (body.refreshToken) {
    try {
      const payload = verifyRefreshToken(body.refreshToken);
      await Session.updateOne(
        { _id: payload.jti, tokenHash: hashToken(body.refreshToken) },
        { $set: { revokedAt: new Date() } },
      );
    } catch {
      // Un token invalido no debe romper el cierre de sesion.
    }
  }
  res.status(204).send();
});

export const forgotPassword = asyncHandler(async (req, res) => {
  const body = req.body as { email: string };
  const user = await User.findOne({ emailNormalized: body.email });

  if (user) {
    const rawToken = randomToken(32);
    await PasswordResetToken.deleteMany({ userId: user._id, usedAt: null });
    await PasswordResetToken.create({
      userId: user._id,
      tokenHash: hashToken(rawToken),
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    });
    logger.info(
      `[password-reset] Token generado para ${user.email}. En produccion debe enviarse por correo.`,
      { userId: user.id },
    );
  }

  res.json({
    message:
      'Si el correo esta registrado, recibiras instrucciones para restablecer tu contrasena.',
  });
});

export const resetPassword = asyncHandler(async (req, res) => {
  const body = req.body as z.infer<typeof resetPasswordSchema>;
  if (!isStrongPassword(body.newPassword)) {
    throw ApiError.badRequest(PASSWORD_POLICY_MESSAGE);
  }
  const token = await PasswordResetToken.findOne({
    tokenHash: hashToken(body.token),
    usedAt: null,
    expiresAt: { $gt: new Date() },
  });
  if (!token) {
    throw ApiError.badRequest('El token de recuperacion no es valido o expiro.');
  }
  const user = await User.findById(token.userId);
  if (!user) {
    throw ApiError.badRequest('El token de recuperacion no es valido.');
  }
  user.passwordHash = await hashPassword(body.newPassword);
  user.failedLoginAttempts = 0;
  user.lockedUntil = null;
  await user.save();

  token.usedAt = new Date();
  await token.save();
  await Session.updateMany(
    { userId: user._id, revokedAt: null },
    { $set: { revokedAt: new Date() } },
  );

  await notifyUser({
    userId: user.id,
    type: 'PASSWORD_CHANGED',
    title: 'Contrasena actualizada',
    message:
      'Tu contrasena fue actualizada. Si no realizaste este cambio, contacta al soporte.',
  });

  res.json({ message: 'Contrasena actualizada correctamente.' });
});

export const requestAccountVerification = asyncHandler(async (req, res) => {
  const body = req.body as z.infer<typeof verificationRequestSchema>;
  const result = await requestVerificationCode({
    userId: req.user!.id,
    channel: body.channel,
  });
  await writeAuditLog(
    {
      actorId: req.user!.id,
      action: 'ACCOUNT_VERIFICATION_REQUESTED',
      entityType: 'USER',
      entityId: req.user!.id,
      metadata: { channel: body.channel },
    },
    req,
  );
  res.status(201).json(result);
});

export const confirmAccountVerification = asyncHandler(async (req, res) => {
  const body = req.body as z.infer<typeof verificationConfirmSchema>;
  const user = await confirmVerificationCode({
    userId: req.user!.id,
    channel: body.channel,
    code: body.code,
  });
  await writeAuditLog(
    {
      actorId: req.user!.id,
      action: 'ACCOUNT_VERIFICATION_CONFIRMED',
      entityType: 'USER',
      entityId: req.user!.id,
      metadata: { channel: body.channel },
    },
    req,
  );
  res.json({ user: mapUser(user) });
});

export const me = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user!.id);
  if (!user) throw ApiError.unauthorized('La cuenta no existe.');

  if (user.role === 'PROFESSIONAL') {
    const profile = await ProfessionalProfile.findOne({ userId: user._id });
    const schedule = await WeeklySchedule.find({ professionalId: user._id });
    res.json({
      user: mapUser(user),
      professionalProfile: profile
        ? mapProfessional(profile, {
            phone: user.phone,
            email: user.email,
            weeklySchedule: schedule.map(mapSchedule),
          })
        : null,
    });
    return;
  }

  res.json({ user: mapUser(user), professionalProfile: null });
});

export const changePassword = asyncHandler(async (req, res) => {
  const body = req.body as {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  };
  if (body.newPassword !== body.confirmPassword) {
    throw ApiError.badRequest('Las contrasenas no coinciden.');
  }
  if (!isStrongPassword(body.newPassword)) {
    throw ApiError.badRequest(PASSWORD_POLICY_MESSAGE);
  }
  const user = await User.findById(req.user!.id).select('+passwordHash');
  if (!user) throw ApiError.unauthorized();
  const valid = await verifyPassword(body.currentPassword, user.passwordHash);
  if (!valid) throw ApiError.badRequest('La contrasena actual no es correcta.');

  user.passwordHash = await hashPassword(body.newPassword);
  await user.save();
  await Session.updateMany(
    { userId: user._id, revokedAt: null },
    { $set: { revokedAt: new Date() } },
  );
  res.json({ message: 'Contrasena actualizada.' });
});
