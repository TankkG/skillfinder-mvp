import { DateTime } from 'luxon';
import type { AvailabilityDay, DayStatus } from '@skillfinder/shared';
import {
  ACTIVE_BOOKING_STATUSES,
  BOOKING_STATUSES,
  DAY_STATUSES,
} from '@skillfinder/shared';
import { env } from '../config/env';
import {
  AvailabilityException,
  Booking,
  BookingSlotLock,
  Service,
  WeeklySchedule,
} from '../models';
import { ApiError } from '../utils/errors';
import {
  alignToSlot,
  buildSlots,
  dayKey,
  localDateTime,
  parseInstant,
  zoneOr,
} from '../utils/time';

export interface AvailabilityOptions {
  professionalId: string;
  serviceId?: string | null;
  from: string;
  to: string;
  timezone?: string;
  durationMinutes?: number;
  now?: Date;
}

export interface AvailabilityResult {
  professionalId: string;
  serviceId: string | null;
  timezone: string;
  slotMinutes: number;
  days: AvailabilityDay[];
}

const MAX_RANGE_DAYS = 62;

const overlap = (
  aStart: DateTime,
  aEnd: DateTime,
  bStart: DateTime,
  bEnd: DateTime,
): boolean => aStart.toMillis() < bEnd.toMillis() && bStart.toMillis() < aEnd.toMillis();

export const resolveServiceDuration = async (
  professionalId: string,
  serviceId?: string | null,
  fallbackMinutes = 60,
): Promise<number> => {
  if (!serviceId) return fallbackMinutes;
  const service = await Service.findById(serviceId);
  if (!service) {
    throw ApiError.notFound('El servicio solicitado no existe.');
  }
  if (String(service.professionalId) !== professionalId) {
    throw ApiError.badRequest('El servicio no pertenece al profesional indicado.');
  }
  if (!service.active) {
    throw ApiError.unprocessable('El servicio no esta activo.');
  }
  return service.estimatedDurationMinutes;
};

export const getAvailability = async (
  options: AvailabilityOptions,
): Promise<AvailabilityResult> => {
  const timezone = zoneOr(options.timezone);
  const now = DateTime.fromJSDate(options.now ?? new Date()).setZone(timezone);

  const rangeStart = DateTime.fromISO(options.from, { zone: timezone }).startOf(
    'day',
  );
  const rangeEnd = DateTime.fromISO(options.to, { zone: timezone }).endOf(
    'day',
  );

  if (!rangeStart.isValid || !rangeEnd.isValid) {
    throw ApiError.badRequest('El rango de fechas no es valido.');
  }
  if (rangeEnd.toMillis() < rangeStart.toMillis()) {
    throw ApiError.badRequest('La fecha final debe ser posterior a la inicial.');
  }

  const dayCount = Math.ceil(
    rangeEnd.startOf('day').diff(rangeStart, 'days').days,
  );
  if (dayCount > MAX_RANGE_DAYS) {
    throw ApiError.badRequest(
      `El rango maximo de consulta es de ${MAX_RANGE_DAYS} dias.`,
    );
  }

  const duration = await resolveServiceDuration(
    options.professionalId,
    options.serviceId,
    options.durationMinutes,
  );

  const rangeStartUtc = rangeStart.toUTC().toJSDate();
  const rangeEndUtc = rangeEnd.toUTC().toJSDate();
  const nowUtc = now.toUTC().toJSDate();
  const buffer = env.SERVICE_BUFFER_MINUTES;

  const [schedules, exceptions, bookings, locks] = await Promise.all([
    WeeklySchedule.find({ professionalId: options.professionalId }).lean(),
    AvailabilityException.find({
      professionalId: options.professionalId,
      startAt: { $lt: rangeEndUtc },
      endAt: { $gt: rangeStartUtc },
    }).lean(),
    Booking.find({
      professionalId: options.professionalId,
      status: { $in: ACTIVE_BOOKING_STATUSES },
      startAt: { $lt: rangeEndUtc },
      endAt: { $gt: rangeStartUtc },
    }).lean(),
    BookingSlotLock.find({
      professionalId: options.professionalId,
      slotStartAt: { $gte: rangeStartUtc, $lt: rangeEndUtc },
      $or: [{ expiresAt: null }, { expiresAt: { $gt: nowUtc } }],
    }).lean(),
  ]);

  const scheduleByDay = new Map(schedules.map((item) => [item.dayOfWeek, item]));
  const validBookings = bookings.filter(
    (booking) =>
      booking.status !== BOOKING_STATUSES.PENDING_PROFESSIONAL ||
      (booking.holdExpiresAt && booking.holdExpiresAt > nowUtc),
  );

  const busyWindows = validBookings.map((booking) => ({
    start: DateTime.fromJSDate(booking.startAt).setZone(timezone),
    end: DateTime.fromJSDate(booking.endAt)
      .setZone(timezone)
      .plus({ minutes: buffer }),
  }));

  const occupiedSlots = new Set(
    locks.map((lock) =>
      DateTime.fromJSDate(lock.slotStartAt).toUTC().toISO() ?? '',
    ),
  );

  const leadThreshold = now.plus({
    minutes: env.BOOKING_MIN_ADVANCE_MINUTES,
  });
  const maxFuture = now.plus({ days: env.BOOKING_MAX_FUTURE_DAYS });

  const days: AvailabilityDay[] = [];

  for (let offset = 0; offset <= dayCount; offset += 1) {
    const day = rangeStart.plus({ days: offset });
    if (day.toMillis() > rangeEnd.toMillis()) break;
    const date = day.toISODate() as string;
    const dayWeek = day.weekday % 7; // Luxon: 1=Lunes..7=Domingo -> 0=Domingo
    const schedule = scheduleByDay.get(dayWeek);

    const dayExceptions = exceptions.filter((exception) => {
      const start = DateTime.fromJSDate(exception.startAt).setZone(timezone);
      const end = DateTime.fromJSDate(exception.endAt).setZone(timezone);
      return overlap(day.startOf('day'), day.endOf('day'), start, end);
    });

    const specialHours = dayExceptions
      .filter((exception) => exception.type === 'SPECIAL_HOURS')
      .map((exception) => {
        const start = DateTime.fromJSDate(exception.startAt).setZone(timezone);
        const end = DateTime.fromJSDate(exception.endAt).setZone(timezone);
        return {
          start: start.toFormat('HH:mm'),
          end: end.toFormat('HH:mm'),
        };
      });

    const blockingExceptions = dayExceptions
      .filter((exception) =>
        ['BLOCKED', 'VACATION', 'BREAK'].includes(exception.type),
      )
      .map((exception) => ({
        start: DateTime.fromJSDate(exception.startAt).setZone(timezone),
        end: DateTime.fromJSDate(exception.endAt).setZone(timezone),
      }));

    const fullDayBlocked = blockingExceptions.some(
      (exception) =>
        exception.start.toMillis() <= day.startOf('day').toMillis() &&
        exception.end.toMillis() >= day.endOf('day').toMillis(),
    );

    const scheduleActive = Boolean(schedule?.active) || specialHours.length > 0;
    const intervals = specialHours.length
      ? specialHours
      : scheduleActive && schedule
        ? (schedule.intervals as { start: string; end: string }[])
        : [];
    const breaks =
      scheduleActive && schedule
        ? (schedule.breaks as { start: string; end: string }[])
        : [];

    const dayBookings = validBookings.filter((booking) =>
      overlap(
        day.startOf('day'),
        day.endOf('day'),
        DateTime.fromJSDate(booking.startAt).setZone(timezone),
        DateTime.fromJSDate(booking.endAt).setZone(timezone),
      ),
    );

    const slots: string[] = [];

    if (scheduleActive && !fullDayBlocked) {
      for (const interval of intervals) {
        const intervalStart = localDateTime(date, interval.start, timezone);
        const intervalEnd = localDateTime(date, interval.end, timezone);
        if (!intervalStart.isValid || !intervalEnd.isValid) continue;

        for (
          let cursor = intervalStart;
          cursor.plus({ minutes: duration }).toMillis() <= intervalEnd.toMillis();
          cursor = cursor.plus({ minutes: env.BOOKING_SLOT_MINUTES })
        ) {
          const slotStart = cursor;
          const slotEnd = cursor.plus({ minutes: duration });
          if (slotStart.toMillis() < leadThreshold.toMillis()) continue;
          if (slotStart.toMillis() > maxFuture.toMillis()) continue;

          const inBreak = breaks.some((pause) =>
            overlap(
              slotStart,
              slotEnd,
              localDateTime(date, pause.start, timezone),
              localDateTime(date, pause.end, timezone),
            ),
          );
          if (inBreak) continue;

          const blocked = blockingExceptions.some((exception) =>
            overlap(slotStart, slotEnd, exception.start, exception.end),
          );
          if (blocked) continue;

          const busy = busyWindows.some((window) =>
            overlap(slotStart, slotEnd, window.start, window.end),
          );
          if (busy) continue;

          const slotDocs = buildSlots(
            slotStart.toUTC().toJSDate(),
            slotEnd.toUTC().toJSDate(),
            env.BOOKING_SLOT_MINUTES,
          );
          if (slotDocs.some((slot) => occupiedSlots.has(slot.key))) continue;

          slots.push(slotStart.toUTC().toISO() as string);
        }
      }
    }

    let status: DayStatus;
    if (fullDayBlocked) {
      status = DAY_STATUSES.BLOCKED;
    } else if (!scheduleActive) {
      status = DAY_STATUSES.CLOSED;
    } else if (slots.length === 0) {
      status = dayBookings.length > 0 ? DAY_STATUSES.FULL : DAY_STATUSES.CLOSED;
    } else if (dayBookings.length > 0) {
      status = DAY_STATUSES.PARTIAL;
    } else {
      status = DAY_STATUSES.AVAILABLE;
    }

    days.push({
      date,
      status,
      slots,
      bookedCount: dayBookings.length,
    });
  }

  return {
    professionalId: options.professionalId,
    serviceId: options.serviceId ?? null,
    timezone,
    slotMinutes: env.BOOKING_SLOT_MINUTES,
    days,
  };
};

export const findNextAvailability = async (
  professionalId: string,
  durationMinutes = 60,
  days = 14,
): Promise<string | null> => {
  const zone = env.DEFAULT_TIMEZONE;
  const from = DateTime.now().setZone(zone).toISODate() as string;
  const to = DateTime.now()
    .setZone(zone)
    .plus({ days })
    .toISODate() as string;
  const availability = await getAvailability({
    professionalId,
    from,
    to,
    durationMinutes,
  });
  for (const day of availability.days) {
    if (day.slots.length > 0) return day.slots[0];
  }
  return null;
};

/**
 * Comprueba que un instante concreto sea reservable. Reutiliza el mismo
 * calculo de disponibilidad que la API expone al cliente.
 */
export const assertSlotAvailable = async (input: {
  professionalId: string;
  serviceId: string;
  startAt: string | Date;
  timezone: string;
}): Promise<{ startAt: Date; endAt: Date; duration: number }> => {
  const timezone = zoneOr(input.timezone);
  const start = parseInstant(input.startAt).setZone(timezone);
  if (!start.isValid) {
    throw ApiError.badRequest('La fecha y hora seleccionadas no son validas.');
  }

  if (
    !alignedToSlot(start, env.BOOKING_SLOT_MINUTES, timezone) ||
    start.toMillis() !==
      alignToSlot(start.toJSDate(), env.BOOKING_SLOT_MINUTES, timezone).toMillis()
  ) {
    throw ApiError.unprocessable(
      `La hora debe estar alineada a bloques de ${env.BOOKING_SLOT_MINUTES} minutos.`,
    );
  }

  const now = DateTime.now().setZone(timezone);
  if (start.toMillis() < now.plus({ minutes: env.BOOKING_MIN_ADVANCE_MINUTES }).toMillis()) {
    throw ApiError.unprocessable(
      `Debes reservar con al menos ${env.BOOKING_MIN_ADVANCE_MINUTES} minutos de anticipacion.`,
    );
  }
  if (start.toMillis() > now.plus({ days: env.BOOKING_MAX_FUTURE_DAYS }).toMillis()) {
    throw ApiError.unprocessable(
      `Solo se puede reservar con hasta ${env.BOOKING_MAX_FUTURE_DAYS} dias de anticipacion.`,
    );
  }

  const duration = await resolveServiceDuration(
    input.professionalId,
    input.serviceId,
  );
  const date = start.toISODate() as string;

  const availability = await getAvailability({
    professionalId: input.professionalId,
    serviceId: input.serviceId,
    from: date,
    to: date,
    timezone,
  });

  const day = availability.days[0];
  const target = start.toUTC().toISO();
  if (!day || !day.slots.includes(target)) {
    throw ApiError.conflict(
      'El horario seleccionado ya no esta disponible. Elige otra hora.',
    );
  }

  const end = start.plus({ minutes: duration });
  return {
    startAt: start.toUTC().toJSDate(),
    endAt: end.toUTC().toJSDate(),
    duration,
  };
};

const alignedToSlot = (
  value: DateTime,
  slotMinutes: number,
  timezone: string,
): boolean => {
  const aligned = alignToSlot(value.toJSDate(), slotMinutes, timezone);
  return value.toMillis() === aligned.toMillis();
};

export const dayKeyFor = (value: string | Date, zone: string): string =>
  dayKey(value, zone);
