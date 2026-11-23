import mongoose, { Types } from 'mongoose';
import { DateTime } from 'luxon';
import {
  BOOKING_STATUSES,
  LOCATION_TYPES,
  VERIFICATION_STATUSES,
} from '@skillfinder/shared';
import { env } from '../config/env';
import { logger } from '../config/logger';
import {
  Booking,
  BookingSlotLock,
  LOCK_STATUSES,
  ProfessionalProfile,
  Service,
  User,
} from '../models';
import { supportsTransactions } from '../database/connect';
import { assertSlotAvailable, findNextAvailability } from './availability';
import { notifyUser } from './notifications';
import { ApiError } from '../utils/errors';
import { buildSlots, formatInZone, toUTC } from '../utils/time';

export interface CreateBookingInput {
  customerId: string;
  customerName: string;
  professionalId: string;
  serviceId: string;
  startAt: string;
  notes?: string;
  serviceLocationType?: 'AT_BUSINESS' | 'AT_CUSTOMER';
  serviceLocation?: { latitude: number; longitude: number } | null;
  idempotencyKey?: string | null;
}

let transactionSupport: boolean | null = null;

const canUseTransactions = async (): Promise<boolean> => {
  if (transactionSupport === null) {
    transactionSupport = await supportsTransactions();
    if (!transactionSupport) {
      logger.warn(
        'MongoDB sin replicaset: se usara la estrategia atomica compensada para reservas.',
      );
    }
  }
  return transactionSupport;
};

const isDuplicateKey = (error: unknown): boolean =>
  Boolean(
    error &&
      typeof error === 'object' &&
      'code' in error &&
      (error as { code?: number }).code === 11000,
  );

const resolveProfessionalUserId = async (professionalId: string) => {
  if (!mongoose.isValidObjectId(professionalId)) {
    throw ApiError.badRequest('Identificador de profesional invalido.');
  }
  const profile = await ProfessionalProfile.findById(professionalId)
    .select('userId')
    .lean();
  return profile ? String(profile.userId) : professionalId;
};

const loadBookableProfessional = async (professionalId: string) => {
  const [user, profile] = await Promise.all([
    User.findById(professionalId),
    ProfessionalProfile.findOne({ userId: professionalId }),
  ]);
  if (!user || user.role !== 'PROFESSIONAL') {
    throw ApiError.notFound('El profesional no existe.');
  }
  if (user.status !== 'ACTIVE') {
    throw ApiError.unprocessable('La cuenta del profesional no esta activa.');
  }
  if (!profile) {
    throw ApiError.notFound('El profesional no tiene perfil comercial.');
  }
  if (
    profile.verificationStatus !== VERIFICATION_STATUSES.APPROVED ||
    !profile.isVisible
  ) {
    throw ApiError.unprocessable(
      'El profesional no esta habilitado para recibir reservas publicas.',
    );
  }
  return { user, profile };
};

export const createBooking = async (input: CreateBookingInput) => {
  if (input.idempotencyKey) {
    const existing = await Booking.findOne({
      customerId: input.customerId,
      idempotencyKey: input.idempotencyKey,
    });
    if (existing) {
      return { booking: existing, reused: true as const };
    }
  }

  const professionalUserId = await resolveProfessionalUserId(
    input.professionalId,
  );
  const { profile } = await loadBookableProfessional(professionalUserId);

  const service = await Service.findOne({
    _id: input.serviceId,
    professionalId: professionalUserId,
    active: true,
  });
  if (!service) {
    throw ApiError.unprocessable(
      'El servicio seleccionado no pertenece al profesional o no esta activo.',
    );
  }

  const timezone = env.DEFAULT_TIMEZONE;
  const window = await assertSlotAvailable({
    professionalId: professionalUserId,
    serviceId: input.serviceId,
    startAt: input.startAt,
    timezone,
  });

  if (input.serviceLocationType === LOCATION_TYPES.AT_CUSTOMER) {
    if (!profile.offersHomeService) {
      throw ApiError.unprocessable(
        'El profesional no ofrece atencion a domicilio.',
      );
    }
    if (!input.serviceLocation) {
      throw ApiError.badRequest(
        'Debes indicar la ubicacion para la atencion a domicilio.',
      );
    }
  }

  const bookingId = new Types.ObjectId();
  const holdExpiresAt = DateTime.now()
    .plus({ minutes: env.BOOKING_HOLD_MINUTES })
    .toUTC()
    .toJSDate();

  const slots = buildSlots(
    window.startAt,
    window.endAt,
    env.BOOKING_SLOT_MINUTES,
  );

  const lockDocs = slots.map((slot) => ({
    professionalId: new Types.ObjectId(professionalUserId),
    bookingId,
    slotStartAt: slot.start,
    lockStatus: LOCK_STATUSES.PENDING,
    expiresAt: holdExpiresAt,
  }));

  const bookingData = {
    _id: bookingId,
    customerId: new Types.ObjectId(input.customerId),
    professionalId: new Types.ObjectId(professionalUserId),
    serviceId: new Types.ObjectId(input.serviceId),
    startAt: window.startAt,
    endAt: window.endAt,
    timezone,
    status: BOOKING_STATUSES.PENDING_PROFESSIONAL,
    notes: input.notes ?? '',
    serviceLocationType:
      input.serviceLocationType ?? LOCATION_TYPES.AT_BUSINESS,
    serviceLocation: input.serviceLocation
      ? {
          type: 'Point' as const,
          coordinates: [
            input.serviceLocation.longitude,
            input.serviceLocation.latitude,
          ] as [number, number],
        }
      : null,
    serviceName: service.name,
    customerName: input.customerName,
    professionalName: profile.businessName,
    idempotencyKey: input.idempotencyKey ?? null,
    holdExpiresAt,
  };

  try {
    if (await canUseTransactions()) {
      const session = await mongoose.startSession();
      try {
        await session.withTransaction(async () => {
          await Booking.create([bookingData], { session });
          await BookingSlotLock.insertMany(lockDocs, {
            session,
            ordered: true,
          });
        });
      } finally {
        await session.endSession();
      }
    } else {
      // Estrategia compensada: los bloqueos unicos se insertan primero para
      // que la condicion de carrera la resuelva el indice de MongoDB.
      try {
        await BookingSlotLock.insertMany(lockDocs, { ordered: true });
      } catch (error) {
        await BookingSlotLock.deleteMany({ bookingId });
        throw error;
      }
      try {
        await Booking.create(bookingData);
      } catch (error) {
        await BookingSlotLock.deleteMany({ bookingId });
        throw error;
      }
    }
  } catch (error) {
    if (isDuplicateKey(error)) {
      if (input.idempotencyKey) {
        const existing = await Booking.findOne({
          customerId: input.customerId,
          idempotencyKey: input.idempotencyKey,
        });
        if (existing) {
          return { booking: existing, reused: true as const };
        }
      }
      throw ApiError.conflict(
        'El horario seleccionado acaba de ser ocupado. Elige otra hora.',
      );
    }
    throw error;
  }

  const booking = await Booking.findById(bookingId);
  if (!booking) {
    throw ApiError.internal('No se pudo recuperar la reserva recien creada.');
  }

  const startLabel = formatInZone(booking.startAt, timezone);
  await Promise.all([
    notifyUser({
      userId: professionalUserId,
      type: 'BOOKING_REQUESTED',
      title: 'Nueva solicitud de reserva',
      message: `${input.customerName} solicito ${service.name} para el ${startLabel}.`,
      entityType: 'BOOKING',
      entityId: String(booking._id),
    }),
    notifyUser({
      userId: input.customerId,
      type: 'BOOKING_REQUEST_SENT',
      title: 'Solicitud enviada',
      message: `Tu solicitud para ${service.name} el ${startLabel} fue enviada al profesional.`,
      entityType: 'BOOKING',
      entityId: String(booking._id),
    }),
  ]);

  return {
    booking,
    reused: false as const,
    nextAvailability: await findNextAvailability(professionalUserId).catch(
      () => null,
    ),
  };
};

const releaseLocks = async (bookingId: Types.ObjectId | string) => {
  await BookingSlotLock.deleteMany({ bookingId });
};

const getProfessionalBooking = async (
  userId: string,
  bookingId: string,
) => {
  if (!mongoose.isValidObjectId(bookingId)) {
    throw ApiError.badRequest('Identificador de reserva invalido.');
  }
  const booking = await Booking.findById(bookingId);
  if (!booking) throw ApiError.notFound('La reserva no existe.');
  return booking;
};

export const acceptBooking = async (userId: string, bookingId: string) => {
  const booking = await getProfessionalBooking(userId, bookingId);
  if (String(booking.professionalId) !== userId) {
    throw ApiError.forbidden('La reserva no pertenece a tu agenda.');
  }
  if (booking.status !== BOOKING_STATUSES.PENDING_PROFESSIONAL) {
    throw ApiError.conflict(
      `No se puede aceptar una reserva en estado ${booking.status}.`,
    );
  }
  if (booking.holdExpiresAt && booking.holdExpiresAt.getTime() <= Date.now()) {
    await expireBooking(booking._id);
    throw ApiError.conflict(
      'La solicitud expiro antes de ser aceptada. Los bloques fueron liberados.',
    );
  }

  booking.status = BOOKING_STATUSES.CONFIRMED;
  booking.acceptedAt = new Date();
  booking.holdExpiresAt = null;
  await booking.save();
  await BookingSlotLock.updateMany(
    { bookingId: booking._id },
    { $set: { lockStatus: LOCK_STATUSES.CONFIRMED }, $unset: { expiresAt: 1 } },
  );

  await notifyUser({
    userId: String(booking.customerId),
    type: 'BOOKING_CONFIRMED',
    title: 'Reserva confirmada',
    message: `${booking.professionalName ?? 'El profesional'} confirmo tu reserva del ${formatInZone(booking.startAt, booking.timezone)}.`,
    entityType: 'BOOKING',
    entityId: String(booking._id),
  });

  return booking;
};

export const rejectBooking = async (
  userId: string,
  bookingId: string,
  reason?: string,
) => {
  const booking = await getProfessionalBooking(userId, bookingId);
  if (String(booking.professionalId) !== userId) {
    throw ApiError.forbidden('La reserva no pertenece a tu agenda.');
  }
  if (booking.status !== BOOKING_STATUSES.PENDING_PROFESSIONAL) {
    throw ApiError.conflict(
      `No se puede rechazar una reserva en estado ${booking.status}.`,
    );
  }
  booking.status = BOOKING_STATUSES.REJECTED;
  booking.rejectedAt = new Date();
  booking.holdExpiresAt = null;
  if (reason) booking.cancellationReason = reason;
  await booking.save();
  await releaseLocks(booking._id);

  await notifyUser({
    userId: String(booking.customerId),
    type: 'BOOKING_REJECTED',
    title: 'Solicitud rechazada',
    message: `El profesional rechazo la solicitud del ${formatInZone(booking.startAt, booking.timezone)}. Puedes elegir otro horario.`,
    entityType: 'BOOKING',
    entityId: String(booking._id),
  });

  return booking;
};

export const cancelBooking = async (input: {
  userId: string;
  role: 'CLIENT' | 'PROFESSIONAL' | 'ADMIN';
  bookingId: string;
  reason?: string;
}) => {
  const booking = await getProfessionalBooking(input.userId, input.bookingId);

  const isCustomer = String(booking.customerId) === input.userId;
  const isProfessional = String(booking.professionalId) === input.userId;
  if (input.role !== 'ADMIN' && !isCustomer && !isProfessional) {
    throw ApiError.forbidden('No participas en esta reserva.');
  }
  if (
    ![BOOKING_STATUSES.PENDING_PROFESSIONAL, BOOKING_STATUSES.CONFIRMED].includes(
      booking.status as never,
    )
  ) {
    throw ApiError.conflict(
      `No se puede cancelar una reserva en estado ${booking.status}.`,
    );
  }

  booking.status =
    input.role === 'PROFESSIONAL'
      ? BOOKING_STATUSES.CANCELLED_BY_PROFESSIONAL
      : BOOKING_STATUSES.CANCELLED_BY_CLIENT;
  booking.cancelledAt = new Date();
  booking.cancelledBy = new Types.ObjectId(input.userId);
  booking.cancellationReason = input.reason ?? null;
  booking.holdExpiresAt = null;
  await booking.save();
  await releaseLocks(booking._id);

  const counterpartId = isCustomer
    ? String(booking.professionalId)
    : String(booking.customerId);
  await notifyUser({
    userId: counterpartId,
    type: 'BOOKING_CANCELLED',
    title: 'Reserva cancelada',
    message: `La reserva del ${formatInZone(booking.startAt, booking.timezone)} fue cancelada.`,
    entityType: 'BOOKING',
    entityId: String(booking._id),
  });

  return booking;
};

export const startBooking = async (userId: string, bookingId: string) => {
  const booking = await getProfessionalBooking(userId, bookingId);
  if (String(booking.professionalId) !== userId) {
    throw ApiError.forbidden('La reserva no pertenece a tu agenda.');
  }
  if (booking.status !== BOOKING_STATUSES.CONFIRMED) {
    throw ApiError.conflict(
      'Solo una reserva confirmada puede marcarse como iniciada.',
    );
  }
  booking.status = BOOKING_STATUSES.IN_PROGRESS;
  booking.startedAt = new Date();
  await booking.save();

  await notifyUser({
    userId: String(booking.customerId),
    type: 'BOOKING_STARTED',
    title: 'Servicio iniciado',
    message: `El servicio del ${formatInZone(booking.startAt, booking.timezone)} esta en curso.`,
    entityType: 'BOOKING',
    entityId: String(booking._id),
  });

  return booking;
};

export const completeBooking = async (userId: string, bookingId: string) => {
  const booking = await getProfessionalBooking(userId, bookingId);
  if (String(booking.professionalId) !== userId) {
    throw ApiError.forbidden('La reserva no pertenece a tu agenda.');
  }
  if (
    ![BOOKING_STATUSES.IN_PROGRESS, BOOKING_STATUSES.CONFIRMED].includes(
      booking.status as never,
    )
  ) {
    throw ApiError.conflict(
      `No se puede finalizar una reserva en estado ${booking.status}.`,
    );
  }
  booking.status = BOOKING_STATUSES.COMPLETED;
  booking.completedAt = new Date();
  if (!booking.startedAt) booking.startedAt = new Date();
  await booking.save();
  await releaseLocks(booking._id);

  await Promise.all([
    notifyUser({
      userId: String(booking.customerId),
      type: 'BOOKING_COMPLETED',
      title: 'Servicio finalizado',
      message: `El servicio del ${formatInZone(booking.startAt, booking.timezone)} finalizo. Ya puedes calificar al profesional.`,
      entityType: 'BOOKING',
      entityId: String(booking._id),
    }),
    notifyUser({
      userId: String(booking.professionalId),
      type: 'BOOKING_COMPLETED_REVIEW',
      title: 'Califica al cliente',
      message:
        'El servicio finalizo. Puedes calificar al cliente asociado a esta reserva.',
      entityType: 'BOOKING',
      entityId: String(booking._id),
    }),
  ]);

  return booking;
};

export const markNoShow = async (
  userId: string,
  bookingId: string,
  reason?: string,
) => {
  const booking = await getProfessionalBooking(userId, bookingId);
  if (String(booking.professionalId) !== userId) {
    throw ApiError.forbidden('La reserva no pertenece a tu agenda.');
  }
  if (booking.status !== BOOKING_STATUSES.CONFIRMED) {
    throw ApiError.conflict(
      'Solo una reserva confirmada puede marcarse como inasistencia.',
    );
  }
  booking.status = BOOKING_STATUSES.NO_SHOW;
  booking.noShowAt = new Date();
  booking.cancellationReason = reason ?? null;
  booking.holdExpiresAt = null;
  await booking.save();
  await releaseLocks(booking._id);

  await notifyUser({
    userId: String(booking.customerId),
    type: 'BOOKING_NO_SHOW',
    title: 'Inasistencia registrada',
    message: `Se registro la inasistencia de la reserva del ${formatInZone(booking.startAt, booking.timezone)}.`,
    entityType: 'BOOKING',
    entityId: String(booking._id),
  });

  return booking;
};

export const expireBooking = async (bookingId: Types.ObjectId | string) => {
  const now = new Date();
  const booking = await Booking.findOneAndUpdate(
    {
      _id: bookingId,
      status: BOOKING_STATUSES.PENDING_PROFESSIONAL,
      holdExpiresAt: { $lte: now },
    },
    {
      $set: {
        status: BOOKING_STATUSES.EXPIRED,
        expiredAt: now,
        holdExpiresAt: null,
      },
    },
    { new: true },
  );
  if (!booking) return null;
  await releaseLocks(booking._id);

  await notifyUser({
    userId: String(booking.customerId),
    type: 'BOOKING_EXPIRED',
    title: 'Solicitud expirada',
    message: `La solicitud del ${formatInZone(booking.startAt, booking.timezone)} expiro sin respuesta. Los bloques fueron liberados.`,
    entityType: 'BOOKING',
    entityId: String(booking._id),
  });

  return booking;
};

export const expirePendingBookings = async (): Promise<number> => {
  const now = new Date();
  const candidates = await Booking.find({
    status: BOOKING_STATUSES.PENDING_PROFESSIONAL,
    holdExpiresAt: { $lte: now },
  })
    .select('_id')
    .limit(200)
    .lean();

  let expired = 0;
  for (const candidate of candidates) {
    const result = await expireBooking(candidate._id);
    if (result) expired += 1;
  }
  return expired;
};

export const canReviewBooking = (booking: {
  status: string;
  customerId: Types.ObjectId;
  professionalId: Types.ObjectId;
}, userId: string): boolean =>
  booking.status === BOOKING_STATUSES.COMPLETED &&
  (String(booking.customerId) === userId ||
    String(booking.professionalId) === userId);

export const normalizeStart = (value: string): Date => toUTC(value);
