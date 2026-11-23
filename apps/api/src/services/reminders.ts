import { DateTime } from 'luxon';
import { BOOKING_STATUSES } from '@skillfinder/shared';
import { env } from '../config/env';
import { Booking } from '../models';
import { notifyUser } from './notifications';

const formatStart = (startAt: Date): string =>
  DateTime.fromJSDate(startAt)
    .setZone(env.DEFAULT_TIMEZONE)
    .setLocale('es')
    .toFormat("dd/MM/yyyy 'a las' HH:mm");

const notifyParticipants = async (
  booking: {
    _id: unknown;
    customerId: unknown;
    professionalId: unknown;
    startAt: Date;
  },
  windowLabel: string,
) => {
  const message = `Tu reserva comienza ${windowLabel} (${formatStart(booking.startAt)}). Revisa el detalle para coordinar.`;
  await Promise.all([
    notifyUser({
      userId: String(booking.customerId),
      type: 'BOOKING_REMINDER',
      title: 'Recordatorio de reserva',
      message,
      entityType: 'BOOKING',
      entityId: String(booking._id),
    }),
    notifyUser({
      userId: String(booking.professionalId),
      type: 'BOOKING_REMINDER',
      title: 'Recordatorio de reserva',
      message,
      entityType: 'BOOKING',
      entityId: String(booking._id),
    }),
  ]);
};

export const sendDueBookingReminders = async (
  now: Date = new Date(),
): Promise<number> => {
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const in1h = new Date(now.getTime() + 60 * 60 * 1000);
  let sent = 0;

  const due24h = await Booking.find({
    status: BOOKING_STATUSES.CONFIRMED,
    reminder24hSentAt: null,
    startAt: { $gt: in1h, $lte: in24h },
  }).limit(100);

  for (const booking of due24h) {
    const claimed = await Booking.findOneAndUpdate(
      {
        _id: booking._id,
        status: BOOKING_STATUSES.CONFIRMED,
        reminder24hSentAt: null,
        startAt: { $gt: in1h, $lte: in24h },
      },
      { $set: { reminder24hSentAt: now } },
      { new: true },
    );
    if (!claimed) continue;
    await notifyParticipants(claimed, 'en menos de 24 horas');
    sent += 1;
  }

  const due1h = await Booking.find({
    status: BOOKING_STATUSES.CONFIRMED,
    reminder1hSentAt: null,
    startAt: { $gt: now, $lte: in1h },
  }).limit(100);

  for (const booking of due1h) {
    const claimed = await Booking.findOneAndUpdate(
      {
        _id: booking._id,
        status: BOOKING_STATUSES.CONFIRMED,
        reminder1hSentAt: null,
        startAt: { $gt: now, $lte: in1h },
      },
      { $set: { reminder1hSentAt: now } },
      { new: true },
    );
    if (!claimed) continue;
    await notifyParticipants(claimed, 'en menos de 1 hora');
    sent += 1;
  }

  return sent;
};
