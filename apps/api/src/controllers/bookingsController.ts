import mongoose from 'mongoose';
import { DateTime } from 'luxon';
import {
  ACTIVE_BOOKING_STATUSES,
  BOOKING_STATUSES,
} from '@skillfinder/shared';
import { env } from '../config/env';
import {
  Booking,
  BookingMessage,
  ProfessionalProfile,
  Review,
  User,
} from '../models';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/errors';
import {
  mapBooking,
  mapBookingMessage,
  mapReview,
} from '../utils/mappers';
import { paginated, parsePagination } from '../utils/pagination';
import {
  acceptBooking,
  cancelBooking,
  completeBooking,
  createBooking,
  markNoShow,
  rejectBooking,
  startBooking,
} from '../services/bookings';
import { idempotencyKeyFrom } from '../validators/bookings';
import { writeAuditLog } from '../utils/audit';
import { notifyUser } from '../services/notifications';

const bookingWithReview = async (
  booking: any,
  userId: string,
) => {
  if (!booking) return null;
  const id = String((booking as { _id?: unknown })._id ?? (booking as { id?: string }).id);
  const customerId = String(booking.customerId);
  const professionalId = String(booking.professionalId);
  const [myReview, customer, professional] = await Promise.all([
    Review.findOne({ bookingId: id, reviewerId: userId }),
    User.findById(customerId).select('customerRatingSummary').lean(),
    ProfessionalProfile.findOne({ userId: professionalId })
      .select('ratingSummary')
      .lean(),
  ]);
  const status = (booking as { status?: string }).status;
  return mapBooking(booking, {
    canReview:
      status === BOOKING_STATUSES.COMPLETED && !myReview && userId !== '',
    myReview: myReview ? mapReview(myReview) : null,
    customerRatingSummary: {
      average: customer?.customerRatingSummary?.average ?? 0,
      count: customer?.customerRatingSummary?.count ?? 0,
    },
    professionalRatingSummary: {
      average: professional?.ratingSummary?.average ?? 0,
      count: professional?.ratingSummary?.count ?? 0,
    },
  });
};

export const createBookingHandler = asyncHandler(async (req, res) => {
  const body = req.body as {
    professionalId: string;
    serviceId: string;
    startAt: string;
    notes?: string;
    serviceLocationType?: 'AT_BUSINESS' | 'AT_CUSTOMER';
    serviceLocation?: { latitude: number; longitude: number };
    idempotencyKey?: string;
  };

  const headerKey = idempotencyKeyFrom(req.get('idempotency-key'));
  const idempotencyKey = headerKey ?? body.idempotencyKey ?? null;

  const result = await createBooking({
    customerId: req.user!.id,
    customerName: req.user!.name,
    professionalId: body.professionalId,
    serviceId: body.serviceId,
    startAt: body.startAt,
    notes: body.notes,
    serviceLocationType: body.serviceLocationType,
    serviceLocation: body.serviceLocation,
    idempotencyKey,
  });

  await writeAuditLog(
    {
      actorId: req.user!.id,
      action: 'BOOKING_CREATED',
      entityType: 'BOOKING',
      entityId: String(result.booking._id),
      metadata: { reused: result.reused, idempotencyKey: Boolean(idempotencyKey) },
    },
    req,
  );

  res.status(result.reused ? 200 : 201).json({
    booking: await bookingWithReview(result.booking, req.user!.id),
    reused: result.reused,
  });
});

export const listMyBookings = asyncHandler(async (req, res) => {
  const query = req.query as unknown as {
    status?: string;
    scope?: 'upcoming' | 'history' | 'all';
  };
  const pagination = parsePagination(req.query as Record<string, unknown>);

  const filter: Record<string, unknown> = {};
  if (req.user!.role === 'CLIENT') filter.customerId = req.user!.id;
  else if (req.user!.role === 'PROFESSIONAL') filter.professionalId = req.user!.id;
  else if (req.user!.role === 'ADMIN') {
    // acceso administrativo sin filtro por participante
  } else {
    throw ApiError.forbidden();
  }

  if (query.status) filter.status = query.status;

  const now = new Date();
  const scope = query.scope ?? 'all';
  if (scope === 'upcoming') {
    filter.status = { $in: ACTIVE_BOOKING_STATUSES };
    filter.endAt = { $gte: now };
  } else if (scope === 'history') {
    filter.$or = [
      { endAt: { $lt: now } },
      {
        status: {
          $in: [
            BOOKING_STATUSES.COMPLETED,
            BOOKING_STATUSES.REJECTED,
            BOOKING_STATUSES.CANCELLED_BY_CLIENT,
            BOOKING_STATUSES.CANCELLED_BY_PROFESSIONAL,
            BOOKING_STATUSES.EXPIRED,
            BOOKING_STATUSES.NO_SHOW,
          ],
        },
      },
    ];
  }

  const sort: Record<string, 1 | -1> =
    scope === 'upcoming' ? { startAt: 1 } : { startAt: -1 };

  const [bookings, total] = await Promise.all([
    Booking.find(filter)
      .sort(sort)
      .skip(pagination.skip)
      .limit(pagination.pageSize)
      .lean(),
    Booking.countDocuments(filter),
  ]);

  const dto = await Promise.all(
    bookings.map(async (booking) => {
      const myReview = await Review.findOne({
        bookingId: booking._id,
        reviewerId: req.user!.id,
      }).lean();
      return mapBooking(booking, {
        canReview:
          booking.status === BOOKING_STATUSES.COMPLETED && !myReview,
        myReview: myReview ? mapReview(myReview) : null,
      });
    }),
  );

  res.json(paginated(dto, total, pagination.page, pagination.pageSize));
});

export const getBooking = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id);
  if (!booking) throw ApiError.notFound('La reserva no existe.');

  const isParticipant =
    String(booking.customerId) === req.user!.id ||
    String(booking.professionalId) === req.user!.id;
  if (!isParticipant && req.user!.role !== 'ADMIN') {
    throw ApiError.forbidden('No participas en esta reserva.');
  }

  res.json(await bookingWithReview(booking, req.user!.id));
});

export const listBookingMessages = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id).lean();
  if (!booking) throw ApiError.notFound('La reserva no existe.');
  const isParticipant =
    String(booking.customerId) === req.user!.id ||
    String(booking.professionalId) === req.user!.id;
  if (!isParticipant && req.user!.role !== 'ADMIN') {
    throw ApiError.forbidden('No participas en esta reserva.');
  }
  const messages = await BookingMessage.find({ bookingId: booking._id })
    .sort({ createdAt: 1 })
    .limit(500);
  res.json({ items: messages.map(mapBookingMessage) });
});

export const sendBookingMessage = asyncHandler(async (req, res) => {
  const body = req.body as { message: string };
  const booking = await Booking.findById(req.params.id);
  if (!booking) throw ApiError.notFound('La reserva no existe.');
  const isCustomer = String(booking.customerId) === req.user!.id;
  const isProfessional = String(booking.professionalId) === req.user!.id;
  if (!isCustomer && !isProfessional) {
    throw ApiError.forbidden('Solo los participantes pueden enviar mensajes.');
  }

  const message = await BookingMessage.create({
    bookingId: booking._id,
    senderId: req.user!.id,
    senderName: req.user!.name,
    senderRole: req.user!.role,
    message: body.message.trim(),
  });

  const recipientId = isCustomer
    ? String(booking.professionalId)
    : String(booking.customerId);
  await notifyUser({
    userId: recipientId,
    type: 'BOOKING_MESSAGE',
    title: 'Nuevo mensaje en tu reserva',
    message: `${req.user!.name}: ${body.message.trim().slice(0, 160)}`,
    entityType: 'BOOKING',
    entityId: String(booking._id),
  });

  res.status(201).json({ message: mapBookingMessage(message) });
});

const actionHandler =
  (
    action: (
      userId: string,
      bookingId: string,
      reason?: string,
    ) => Promise<unknown>,
    actionName: string,
  ) =>
    asyncHandler(async (req, res) => {
      const body = req.body as { reason?: string };
      const booking = await action(
        req.user!.id,
        req.params.id,
        body.reason,
      );
      await writeAuditLog(
        {
          actorId: req.user!.id,
          action: actionName,
          entityType: 'BOOKING',
          entityId: req.params.id,
          metadata: { reason: body.reason },
        },
        req,
      );
      res.json(await bookingWithReview(booking as never, req.user!.id));
    });

export const acceptBookingHandler = actionHandler(
  (userId, bookingId) => acceptBooking(userId, bookingId),
  'BOOKING_ACCEPTED',
);

export const rejectBookingHandler = actionHandler(
  (userId, bookingId, reason) => rejectBooking(userId, bookingId, reason),
  'BOOKING_REJECTED',
);

export const startBookingHandler = actionHandler(
  (userId, bookingId) => startBooking(userId, bookingId),
  'BOOKING_STARTED',
);

export const completeBookingHandler = actionHandler(
  (userId, bookingId) => completeBooking(userId, bookingId),
  'BOOKING_COMPLETED',
);

export const noShowHandler = actionHandler(
  (userId, bookingId, reason) => markNoShow(userId, bookingId, reason),
  'BOOKING_NO_SHOW',
);

export const cancelBookingHandler = asyncHandler(async (req, res) => {
  const body = req.body as { reason?: string };
  const booking = await cancelBooking({
    userId: req.user!.id,
    role: req.user!.role as 'CLIENT' | 'PROFESSIONAL' | 'ADMIN',
    bookingId: req.params.id,
    reason: body.reason,
  });
  await writeAuditLog(
    {
      actorId: req.user!.id,
      action: 'BOOKING_CANCELLED',
      entityType: 'BOOKING',
      entityId: req.params.id,
      metadata: { reason: body.reason },
    },
    req,
  );
  res.json(await bookingWithReview(booking, req.user!.id));
});

export const bookingsOverview = asyncHandler(async (req, res) => {
  if (req.user!.role !== 'PROFESSIONAL') {
    throw ApiError.forbidden('Solo profesionales tienen agenda.');
  }
  const zone = env.DEFAULT_TIMEZONE;
  const now = DateTime.now().setZone(zone);
  const soon = now.plus({ hours: 48 }).toUTC().toJSDate();

  const [pending, upcoming, totalCompleted, today] = await Promise.all([
    Booking.countDocuments({
      professionalId: req.user!.id,
      status: BOOKING_STATUSES.PENDING_PROFESSIONAL,
      holdExpiresAt: { $gt: new Date() },
    }),
    Booking.find({
      professionalId: req.user!.id,
      status: { $in: ACTIVE_BOOKING_STATUSES },
      startAt: { $gte: now.toUTC().toJSDate(), $lte: soon },
    })
      .sort({ startAt: 1 })
      .limit(10)
      .lean(),
    Booking.countDocuments({
      professionalId: req.user!.id,
      status: BOOKING_STATUSES.COMPLETED,
    }),
    Booking.countDocuments({
      professionalId: req.user!.id,
      startAt: {
        $gte: now.startOf('day').toUTC().toJSDate(),
        $lte: now.endOf('day').toUTC().toJSDate(),
      },
      status: { $in: ACTIVE_BOOKING_STATUSES },
    }),
  ]);

  res.json({
    pendingRequests: pending,
    todayBookings: today,
    completedTotal: totalCompleted,
    upcoming: upcoming.map((booking) => mapBooking(booking)),
  });
});
