import { DateTime } from 'luxon';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { BOOKING_STATUSES, DAY_STATUSES } from '@skillfinder/shared';
import { Booking } from '../models';
import { getAvailability } from './availability';
import {
  TEST_ZONE,
  cleanDatabase,
  createProfessional,
  createService,
  createWeekSchedule,
  nextLocalDateTime,
  startTestDatabase,
  stopTestDatabase,
} from '../__tests__/helpers';

const localIso = (value: string): string => {
  const dt = DateTime.fromISO(value, { zone: 'utc' }).setZone(TEST_ZONE);
  return dt.toFormat('HH:mm');
};

describe('calculo de disponibilidad', () => {
  beforeAll(async () => {
    await startTestDatabase();
  });

  afterAll(async () => {
    await stopTestDatabase();
  });

  beforeEach(async () => {
    await cleanDatabase();
  });

  it('respeta horario, descanso y duracion del servicio', async () => {
    const { user } = await createProfessional();
    const service = await createService(String(user._id), 60);
    await createWeekSchedule(
      String(user._id),
      [{ start: '09:00', end: '12:00' }],
      [{ start: '10:00', end: '11:00' }],
    );

    const targetDay = nextLocalDateTime(2, 0).startOf('day');
    const result = await getAvailability({
      professionalId: String(user._id),
      serviceId: String(service._id),
      from: targetDay.toISODate() as string,
      to: targetDay.toISODate() as string,
      timezone: TEST_ZONE,
      now: targetDay.toUTC().toJSDate(),
    });

    expect(result.days).toHaveLength(1);
    const day = result.days[0];
    expect(day.status).toBe(DAY_STATUSES.AVAILABLE);
    expect(day.slots.map(localIso)).toEqual(['09:00', '11:00']);
  });

  it('excluye horarios ocupados por una reserva activa', async () => {
    const { user } = await createProfessional();
    const service = await createService(String(user._id), 60);
    await createWeekSchedule(
      String(user._id),
      [{ start: '09:00', end: '13:00' }],
    );

    const targetDay = nextLocalDateTime(2, 0).startOf('day');
    const bookingStart = targetDay.set({ hour: 9 });
    await Booking.create({
      customerId: user._id,
      professionalId: user._id,
      serviceId: service._id,
      startAt: bookingStart.toUTC().toJSDate(),
      endAt: bookingStart.plus({ minutes: 60 }).toUTC().toJSDate(),
      timezone: TEST_ZONE,
      status: BOOKING_STATUSES.CONFIRMED,
    });

    const result = await getAvailability({
      professionalId: String(user._id),
      serviceId: String(service._id),
      from: targetDay.toISODate() as string,
      to: targetDay.toISODate() as string,
      timezone: TEST_ZONE,
      now: targetDay.toUTC().toJSDate(),
    });

    const day = result.days[0];
    const slots = day.slots.map(localIso);
    expect(slots).not.toContain('09:00');
    expect(slots).toContain('10:00');
    expect(day.status).toBe(DAY_STATUSES.PARTIAL);
    expect(day.bookedCount).toBe(1);
  });

  it('marca el dia como bloqueado por una excepcion de dia completo', async () => {
    const { user } = await createProfessional();
    const service = await createService(String(user._id), 60);
    await createWeekSchedule(String(user._id));
    const targetDay = nextLocalDateTime(2, 0).startOf('day');

    const { AvailabilityException } = await import('../models');
    await AvailabilityException.create({
      professionalId: user._id,
      startAt: targetDay.toUTC().toJSDate(),
      endAt: targetDay.plus({ days: 1 }).toUTC().toJSDate(),
      type: 'BLOCKED',
      reason: 'Dia de prueba',
    });

    const result = await getAvailability({
      professionalId: String(user._id),
      serviceId: String(service._id),
      from: targetDay.toISODate() as string,
      to: targetDay.toISODate() as string,
      timezone: TEST_ZONE,
      now: targetDay.toUTC().toJSDate(),
    });

    expect(result.days[0].status).toBe(DAY_STATUSES.BLOCKED);
    expect(result.days[0].slots).toHaveLength(0);
  });
});
