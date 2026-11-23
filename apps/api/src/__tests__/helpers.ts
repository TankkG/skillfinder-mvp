import { DateTime } from 'luxon';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import {
  BOOKING_STATUSES,
  ROLES,
  USER_STATUSES,
  VERIFICATION_STATUSES,
} from '@skillfinder/shared';
import {
  Booking,
  BookingSlotLock,
  ProfessionalProfile,
  Review,
  Service,
  ServiceCategory,
  User,
  WeeklySchedule,
} from '../models';

export const TEST_ZONE = 'America/La_Paz';

let mongo: MongoMemoryServer | null = null;

export const startTestDatabase = async (): Promise<void> => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
  await Promise.all([
    Booking.init(),
    BookingSlotLock.init(),
    User.init(),
    Review.init(),
    Service.init(),
    ServiceCategory.init(),
    WeeklySchedule.init(),
    ProfessionalProfile.init(),
  ]);
};

export const stopTestDatabase = async (): Promise<void> => {
  await mongoose.disconnect();
  if (mongo) {
    await mongo.stop();
    mongo = null;
  }
};

export const cleanDatabase = async (): Promise<void> => {
  const db = mongoose.connection.db;
  if (!db) return;
  const collections = await db.collections();
  await Promise.all(collections.map((collection) => collection.deleteMany({})));
};

let sequence = 0;
const nextEmail = (prefix: string): string => {
  sequence += 1;
  return `${prefix}${sequence}@test.local`;
};

export const createClient = async (name = 'Cliente de Prueba') => {
  const email = nextEmail('cliente');
  return User.create({
    name,
    email,
    emailNormalized: email,
    phone: '+59170000001',
    passwordHash: 'test-hash',
    role: ROLES.CLIENT,
    status: USER_STATUSES.ACTIVE,
  });
};

export const createProfessional = async (options?: {
  approved?: boolean;
  offersHomeService?: boolean;
}) => {
  const email = nextEmail('profesional');
  const user = await User.create({
    name: 'Profesional de Prueba',
    email,
    emailNormalized: email,
    phone: '+59170000002',
    passwordHash: 'test-hash',
    role: ROLES.PROFESSIONAL,
    status: USER_STATUSES.ACTIVE,
  });

  const approved = options?.approved ?? true;
  const profile = await ProfessionalProfile.create({
    userId: user._id,
    displayName: 'Profesional de Prueba',
    businessName: 'Taller de Prueba',
    description: 'Perfil de prueba',
    categories: ['MEC'],
    specialties: ['Mantenimiento preventivo'],
    addressText: 'Calle de prueba 123',
    location: { type: 'Point', coordinates: [-66.1568, -17.3895] },
    verificationStatus: approved
      ? VERIFICATION_STATUSES.APPROVED
      : VERIFICATION_STATUSES.PENDING_VERIFICATION,
    isVisible: approved,
    offersHomeService: options?.offersHomeService ?? false,
  });

  return { user, profile };
};

export const createService = async (
  professionalId: string,
  durationMinutes = 60,
) => {
  const category = await ServiceCategory.findOneAndUpdate(
    { code: 'MEC' },
    {
      $setOnInsert: {
        code: 'MEC',
        name: 'Mecanico automotriz',
        parentId: null,
        isSpecialty: false,
        active: true,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  return Service.create({
    professionalId,
    categoryId: category._id,
    categoryCode: 'MEC',
    name: `Servicio ${durationMinutes} minutos`,
    description: 'Servicio de prueba',
    estimatedDurationMinutes: durationMinutes,
    estimatedPrice: 100,
    active: true,
  });
};

export const createWeekSchedule = async (
  professionalId: string,
  intervals: { start: string; end: string }[] = [
    { start: '08:00', end: '20:00' },
  ],
  breaks: { start: string; end: string }[] = [],
) => {
  const docs = [];
  for (let dayOfWeek = 0; dayOfWeek <= 6; dayOfWeek += 1) {
    docs.push({
      professionalId,
      dayOfWeek,
      intervals,
      breaks,
      active: true,
      timezone: TEST_ZONE,
    });
  }
  return WeeklySchedule.insertMany(docs);
};

export const nextLocalDateTime = (
  daysAhead: number,
  hour: number,
  minute = 0,
): DateTime =>
  DateTime.now()
    .setZone(TEST_ZONE)
    .plus({ days: daysAhead })
    .set({ hour, minute, second: 0, millisecond: 0 });

export const createCompletedBooking = async (input: {
  customerId: string;
  professionalId: string;
  serviceId: string;
}) => {
  const start = nextLocalDateTime(-3, 10);
  const end = start.plus({ minutes: 60 });
  return Booking.create({
    customerId: input.customerId,
    professionalId: input.professionalId,
    serviceId: input.serviceId,
    startAt: start.toUTC().toJSDate(),
    endAt: end.toUTC().toJSDate(),
    timezone: TEST_ZONE,
    status: BOOKING_STATUSES.COMPLETED,
    serviceName: 'Servicio de prueba',
  });
};
