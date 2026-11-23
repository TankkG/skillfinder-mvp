import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { BOOKING_STATUSES } from '@skillfinder/shared';
import { createBooking } from './bookings';
import {
  TEST_ZONE,
  cleanDatabase,
  createClient,
  createProfessional,
  createService,
  createWeekSchedule,
  nextLocalDateTime,
  startTestDatabase,
  stopTestDatabase,
} from '../__tests__/helpers';

describe('creacion de reservas', () => {
  beforeAll(async () => {
    await startTestDatabase();
  });

  afterAll(async () => {
    await stopTestDatabase();
  });

  beforeEach(async () => {
    await cleanDatabase();
  });

  it('solo permite que una de dos solicitudes simultaneas tome el horario', async () => {
    const { user: professional } = await createProfessional();
    const service = await createService(String(professional._id), 60);
    await createWeekSchedule(String(professional._id));
    const [clientA, clientB] = await Promise.all([createClient('A'), createClient('B')]);
    const startAt = nextLocalDateTime(2, 10).toISO();

    const results = await Promise.allSettled([
      createBooking({
        customerId: String(clientA._id),
        customerName: clientA.name,
        professionalId: String(professional._id),
        serviceId: String(service._id),
        startAt,
      }),
      createBooking({
        customerId: String(clientB._id),
        customerName: clientB.name,
        professionalId: String(professional._id),
        serviceId: String(service._id),
        startAt,
      }),
    ]);

    const fulfilled = results.filter((result) => result.status === 'fulfilled');
    const rejected = results.filter((result) => result.status === 'rejected');
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);

    const rejection = rejected[0] as PromiseRejectedResult;
    expect((rejection.reason as { statusCode?: number }).statusCode).toBe(409);
  });

  it('reutiliza la reserva cuando se repite la clave de idempotencia', async () => {
    const { user: professional } = await createProfessional();
    const service = await createService(String(professional._id), 60);
    await createWeekSchedule(String(professional._id));
    const client = await createClient();
    const startAt = nextLocalDateTime(2, 11).toISO();

    const first = await createBooking({
      customerId: String(client._id),
      customerName: client.name,
      professionalId: String(professional._id),
      serviceId: String(service._id),
      startAt,
      idempotencyKey: 'clave-de-prueba',
    });
    const second = await createBooking({
      customerId: String(client._id),
      customerName: client.name,
      professionalId: String(professional._id),
      serviceId: String(service._id),
      startAt,
      idempotencyKey: 'clave-de-prueba',
    });

    expect(first.reused).toBe(false);
    expect(second.reused).toBe(true);
    expect(String(second.booking._id)).toBe(String(first.booking._id));
    expect(first.booking.status).toBe(BOOKING_STATUSES.PENDING_PROFESSIONAL);
  });

  it('acepta el id publico del perfil y guarda el id de usuario', async () => {
    const { user: professional, profile } = await createProfessional();
    const service = await createService(String(professional._id), 60);
    await createWeekSchedule(String(professional._id));
    const client = await createClient();

    const result = await createBooking({
      customerId: String(client._id),
      customerName: client.name,
      professionalId: String(profile._id),
      serviceId: String(service._id),
      startAt: nextLocalDateTime(2, 13).toISO(),
    });

    expect(String(result.booking.professionalId)).toBe(
      String(professional._id),
    );
    expect(result.booking.status).toBe(
      BOOKING_STATUSES.PENDING_PROFESSIONAL,
    );
  });

  it('rechaza reservas de profesionales no aprobados', async () => {
    const { user: professional } = await createProfessional({ approved: false });
    const service = await createService(String(professional._id), 60);
    await createWeekSchedule(String(professional._id));
    const client = await createClient();

    await expect(
      createBooking({
        customerId: String(client._id),
        customerName: client.name,
        professionalId: String(professional._id),
        serviceId: String(service._id),
        startAt: nextLocalDateTime(2, 12).toISO(),
      }),
    ).rejects.toMatchObject({ statusCode: 422 });
  });
});
