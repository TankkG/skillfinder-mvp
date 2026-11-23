/* eslint-disable no-console */
import { DateTime } from 'luxon';
import {
  BOOKING_STATUSES,
  CATEGORY_CATALOG,
  MODERATION_STATUSES,
  REVIEW_DIRECTIONS,
  ROLES,
  USER_STATUSES,
  VERIFICATION_STATUSES,
} from '@skillfinder/shared';
import { connectDatabase, disconnectDatabase } from '../database/connect';
import { env } from '../config/env';
import {
  Booking,
  AuditLog,
  BookingSlotLock,
  ContentEntry,
  ProfessionalProfile,
  Review,
  Service,
  ServiceArea,
  ServiceCategory,
  User,
  WeeklySchedule,
} from '../models';
import { hashPassword } from '../utils/password';
import { buildSlots } from '../utils/time';
import {
  recalculateCustomerRating,
  recalculateProfessionalRating,
} from '../services/reviews';
import { contentFallbacks } from '../services/content';

const PILOT_POLYGON = {
  type: 'Polygon' as const,
  coordinates: [
    [
      [-66.2, -17.36],
      [-66.12, -17.355],
      [-66.11, -17.39],
      [-66.13, -17.418],
      [-66.185, -17.412],
      [-66.205, -17.385],
      [-66.2, -17.36],
    ],
  ],
};

const slug = (value: string): string =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

const upsertUser = async (input: {
  name: string;
  email: string;
  phone: string;
  password: string;
  role: 'CLIENT' | 'PROFESSIONAL' | 'ADMIN';
}) => {
  const emailNormalized = input.email.toLowerCase();
  let user = await User.findOne({ emailNormalized });
  if (!user) {
    user = await User.create({
      name: input.name,
      email: emailNormalized,
      emailNormalized,
      phone: input.phone,
      passwordHash: await hashPassword(input.password),
      role: input.role,
      status: USER_STATUSES.ACTIVE,
      termsAcceptedAt: new Date(),
      privacyAcceptedAt: new Date(),
      emailVerifiedAt: new Date(),
    });
    console.log(`Usuario creado: ${input.email} (${input.role})`);
  } else {
    console.log(`Usuario existente: ${input.email}`);
  }
  return user;
};

const getOrCreateProfile = async (input: {
  userId: string;
  displayName: string;
  businessName: string;
  description: string;
  categories: string[];
  specialties: string[];
  addressText: string;
  latitude: number;
  longitude: number;
  serviceAreaId: string;
  photoUrl?: string;
  ratingAverage?: number;
  ratingCount?: number;
}) => {
  let profile = await ProfessionalProfile.findOne({ userId: input.userId });
  if (!profile) {
    profile = await ProfessionalProfile.create({
      userId: input.userId,
      displayName: input.displayName,
      businessName: input.businessName,
      description: input.description,
      categories: input.categories,
      specialties: input.specialties,
      addressText: input.addressText,
      location: {
        type: 'Point',
        coordinates: [input.longitude, input.latitude],
      },
      serviceAreaId: input.serviceAreaId,
      verificationStatus: VERIFICATION_STATUSES.APPROVED,
      isVisible: true,
      approvedAt: new Date(),
      offersHomeService: false,
      ratingSummary: {
        average: input.ratingAverage ?? 0,
        count: input.ratingCount ?? 0,
      },
      photoUrl: input.photoUrl ?? null,
    });
    console.log(`Perfil profesional creado: ${input.businessName}`);
  }
  return profile;
};

const ensureServices = async (input: {
  professionalId: string;
  items: {
    categoryCode: string;
    specialtyName: string;
    name: string;
    description: string;
    duration: number;
    price: number;
  }[];
}) => {
  const created: Record<string, string> = {};
  for (const item of input.items) {
    const category = await ServiceCategory.findOne({
      code: item.categoryCode,
      parentId: null,
    });
    if (!category) continue;
    const specialty = await ServiceCategory.findOne({
      parentId: category._id,
      name: item.specialtyName,
    });
    let service = await Service.findOne({
      professionalId: input.professionalId,
      name: item.name,
    });
    if (!service) {
      service = await Service.create({
        professionalId: input.professionalId,
        categoryId: category._id,
        categoryCode: category.code,
        specialtyId: specialty?._id ?? null,
        specialtyName: specialty?.name ?? item.specialtyName,
        name: item.name,
        description: item.description,
        estimatedDurationMinutes: item.duration,
        estimatedPrice: item.price,
        active: true,
      });
    }
    created[item.name] = String(service._id);
  }
  return created;
};

const ensureSchedule = async (professionalId: string) => {
  for (let day = 0; day <= 6; day += 1) {
    const closed = day === 0;
    await WeeklySchedule.findOneAndUpdate(
      { professionalId, dayOfWeek: day },
      {
        $set: {
          intervals:
            day === 6
              ? [{ start: '08:00', end: '13:00' }]
              : closed
                ? []
                : [{ start: '08:00', end: '19:00' }],
          breaks:
            day >= 1 && day <= 5
              ? [{ start: '12:00', end: '13:00' }]
              : [],
          active: !closed,
          timezone: env.DEFAULT_TIMEZONE,
        },
      },
      { upsert: true, setDefaultsOnInsert: true },
    );
  }
};

const main = async () => {
  await connectDatabase();
  console.log('Sembrando datos de SkillFinder...');

  const area = await ServiceArea.findOneAndUpdate(
    { code: 'CBBA-D2' },
    {
      $set: {
        name: 'Distrito 2 - Cercado (poligono provisional)',
        municipality: 'Cercado',
        department: 'Cochabamba',
        country: 'Bolivia',
        boundary: PILOT_POLYGON,
        active: true,
        sourceReference:
          'PLACEHOLDER PROVISIONAL: debe reemplazarse por el limite oficial verificado del Distrito 2 (DP-02).',
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  console.log('Area piloto CBBA-D2 lista (poligono provisional).');

  for (const category of CATEGORY_CATALOG) {
    const main = await ServiceCategory.findOneAndUpdate(
      { code: category.code },
      {
        $set: {
          name: category.name,
          description: category.description,
          parentId: null,
          isSpecialty: false,
          active: true,
          sortOrder: CATEGORY_CATALOG.findIndex(
            (item) => item.code === category.code,
          ),
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    const specialties: Record<string, string> = {};
    for (const [index, specialtyName] of category.specialties.entries()) {
      const code = `${category.code}-${slug(specialtyName)}`;
      const specialty = await ServiceCategory.findOneAndUpdate(
        { code },
        {
          $set: {
            name: specialtyName,
            description: `${specialtyName} (${category.name})`,
            parentId: main._id,
            isSpecialty: true,
            active: true,
            sortOrder: index,
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      );
      specialties[specialtyName] = String(specialty._id);
    }
  }
  console.log('Catalogo de categorias y subespecialidades listo.');

  for (const fallback of contentFallbacks()) {
    await ContentEntry.findOneAndUpdate(
      { key: fallback.key },
      {
        $set: {
          kind: fallback.kind,
          title: fallback.title,
          body: fallback.body,
          items: fallback.items,
          published: fallback.published,
          sortOrder: fallback.sortOrder,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
  }
  console.log('Contenido editable inicial (FAQ y politica) listo.');

  const admin = await upsertUser({
    name: env.ADMIN_NAME,
    email: env.ADMIN_EMAIL,
    phone: '+59170000000',
    password: env.ADMIN_PASSWORD,
    role: ROLES.ADMIN,
  });

  const client = await upsertUser({
    name: 'Ana Cliente Demo',
    email: 'cliente@skillfinder.bo',
    phone: '+59171111111',
    password: 'Cliente12345!',
    role: ROLES.CLIENT,
  });

  const client2 = await upsertUser({
    name: 'Luis Cliente Demo',
    email: 'cliente2@skillfinder.bo',
    phone: '+59172222222',
    password: 'Cliente12345!',
    role: ROLES.CLIENT,
  });

  const client3 = await upsertUser({
    name: 'Carla Cliente Demo',
    email: 'cliente3@skillfinder.bo',
    phone: '+59172222223',
    password: 'Cliente12345!',
    role: ROLES.CLIENT,
  });

  const professionalsSeed = [
    {
      email: 'mecanico@skillfinder.bo',
      name: 'Carlos Mamani',
      phone: '+59173333333',
      businessName: 'Taller Mecanico El Motor',
      description:
        'Taller especializado en mantenimiento preventivo, frenos y diagnostico de motor.',
      categories: ['MEC'],
      specialties: ['Mantenimiento preventivo', 'Frenos', 'Diagnostico de motor'],
      addressText: 'Av. Ayacucho #123, cerca de la plaza',
      latitude: -17.3895,
      longitude: -66.1568,
      services: [
        {
          categoryCode: 'MEC',
          specialtyName: 'Mantenimiento preventivo',
          name: 'Mantenimiento preventivo completo',
          description: 'Cambio de aceite, filtros y revision general.',
          duration: 60,
          price: 180,
        },
        {
          categoryCode: 'MEC',
          specialtyName: 'Frenos',
          name: 'Revision y cambio de frenos',
          description: 'Inspeccion de pastillas, discos y liquido de frenos.',
          duration: 90,
          price: 250,
        },
      ],
    },
    {
      email: 'chapero@skillfinder.bo',
      name: 'Jorge Quispe',
      phone: '+59174444444',
      businessName: 'Chaperia Los Andes',
      description:
        'Desabollado, enderezado y pintura de carroceria con acabado profesional.',
      categories: ['CHA'],
      specialties: ['Desabollado', 'Enderezado', 'Reparacion de carroceria'],
      addressText: 'Calle Sucre #456',
      latitude: -17.377,
      longitude: -66.163,
      services: [
        {
          categoryCode: 'CHA',
          specialtyName: 'Desabollado',
          name: 'Desabollado y pintura',
          description: 'Reparacion de abolladuras y pintura por pieza.',
          duration: 120,
          price: 400,
        },
      ],
    },
    {
      email: 'gomero@skillfinder.bo',
      name: 'Maria Lopez',
      phone: '+59175555555',
      businessName: 'Gomeria Central',
      description:
        'Cambio de neumaticos, parchado, balanceo y rotacion de llantas.',
      categories: ['GOM'],
      specialties: ['Cambio de neumaticos', 'Balanceo', 'Parchado'],
      addressText: 'Av. Blanco Galindo km 2',
      latitude: -17.392,
      longitude: -66.145,
      services: [
        {
          categoryCode: 'GOM',
          specialtyName: 'Cambio de neumaticos',
          name: 'Cambio y balanceo de neumaticos',
          description: 'Montaje y balanceo de hasta 4 neumaticos.',
          duration: 30,
          price: 80,
        },
        {
          categoryCode: 'GOM',
          specialtyName: 'Parchado',
          name: 'Parchado de llanta',
          description: 'Reparacion de pinchazos con vulcanizado.',
          duration: 30,
          price: 40,
        },
      ],
    },
    {
      email: 'electricista@skillfinder.bo',
      name: 'Pedro Rojas',
      phone: '+59176666666',
      businessName: 'Electricidad Automotriz Rojas',
      description:
        'Diagnostico electronico, baterias, alternadores y sistemas de iluminacion.',
      categories: ['ELA'],
      specialties: ['Bateria', 'Alternador', 'Diagnostico electronico'],
      addressText: 'Calle Antezana #789',
      latitude: -17.384,
      longitude: -66.171,
      services: [
        {
          categoryCode: 'ELA',
          specialtyName: 'Diagnostico electronico',
          name: 'Escaneo y diagnostico electronico',
          description: 'Lectura de codigos de falla y revision de sensores.',
          duration: 45,
          price: 120,
        },
        {
          categoryCode: 'ELA',
          specialtyName: 'Bateria',
          name: 'Revision y cambio de bateria',
          description: 'Prueba de carga y reemplazo de bateria.',
          duration: 30,
          price: 60,
        },
      ],
    },
  ];

  const professionalUsers: Record<string, typeof client> = {};
  const professionalServices: Record<string, Record<string, string>> = {};

  for (const seed of professionalsSeed) {
    const user = await upsertUser({
      name: seed.name,
      email: seed.email,
      phone: seed.phone,
      password: 'Pro123456!',
      role: ROLES.PROFESSIONAL,
    });
    professionalUsers[seed.categories[0]] = user;

    await getOrCreateProfile({
      userId: user.id,
      displayName: seed.name,
      businessName: seed.businessName,
      description: seed.description,
      categories: seed.categories,
      specialties: seed.specialties,
      addressText: seed.addressText,
      latitude: seed.latitude,
      longitude: seed.longitude,
      serviceAreaId: String(area._id),
    });

    professionalServices[seed.categories[0]] = await ensureServices({
      professionalId: user.id,
      items: seed.services,
    });
    await ensureSchedule(user.id);
  }
  console.log('Profesionales, servicios y horarios de demostracion listos.');

  const mechanic = professionalUsers.MEC;
  const mechanicServiceName = 'Mantenimiento preventivo completo';
  const mechanicServiceId =
    professionalServices.MEC?.[mechanicServiceName] ??
    (await Service.findOne({
      professionalId: mechanic.id,
      name: mechanicServiceName,
    }))?._id.toString();

  if (mechanicServiceId) {
    const pastStart = DateTime.now()
      .setZone(env.DEFAULT_TIMEZONE)
      .minus({ days: 7 })
      .set({ hour: 10, minute: 0, second: 0, millisecond: 0 });
    const pastEnd = pastStart.plus({ minutes: 60 });

    let completed = await Booking.findOne({
      customerId: client.id,
      idempotencyKey: 'seed-completed-booking',
    });
    if (!completed) {
      completed = await Booking.create({
        customerId: client._id,
        professionalId: mechanic._id,
        serviceId: mechanicServiceId,
        startAt: pastStart.toUTC().toJSDate(),
        endAt: pastEnd.toUTC().toJSDate(),
        timezone: env.DEFAULT_TIMEZONE,
        status: BOOKING_STATUSES.COMPLETED,
        notes: 'Reserva de demostracion ya finalizada.',
        serviceName: mechanicServiceName,
        customerName: client.name,
        professionalName: 'Taller Mecanico El Motor',
        idempotencyKey: 'seed-completed-booking',
        acceptedAt: pastStart.minus({ days: 1 }).toJSDate(),
        startedAt: pastStart.toJSDate(),
        completedAt: pastEnd.toJSDate(),
        serviceLocationType: 'AT_BUSINESS',
      });
      await Review.create({
        bookingId: completed._id,
        reviewerId: client._id,
        revieweeId: mechanic._id,
        reviewerRole: ROLES.CLIENT,
        direction: REVIEW_DIRECTIONS.CUSTOMER_TO_PROFESSIONAL,
        rating: 5,
        comment: 'Excelente atencion y trabajo muy profesional.',
        moderationStatus: MODERATION_STATUSES.PUBLISHED,
      });
      await Review.create({
        bookingId: completed._id,
        reviewerId: mechanic._id,
        revieweeId: client._id,
        reviewerRole: ROLES.PROFESSIONAL,
        direction: REVIEW_DIRECTIONS.PROFESSIONAL_TO_CUSTOMER,
        rating: 5,
        comment: 'Cliente puntual y respetuoso.',
        moderationStatus: MODERATION_STATUSES.PUBLISHED,
      });
      console.log('Reserva completada y resenas bidireccionales creadas.');
    }

    const upcomingStart = DateTime.now()
      .setZone(env.DEFAULT_TIMEZONE)
      .plus({ days: 2 })
      .set({ hour: 9, minute: 0, second: 0, millisecond: 0 });
    const upcomingEnd = upcomingStart.plus({ minutes: 60 });

    const existingUpcoming = await Booking.findOne({
      customerId: client2.id,
      idempotencyKey: 'seed-confirmed-booking',
    });
    if (!existingUpcoming) {
      const upcoming = await Booking.create({
        customerId: client2._id,
        professionalId: mechanic._id,
        serviceId: mechanicServiceId,
        startAt: upcomingStart.toUTC().toJSDate(),
        endAt: upcomingEnd.toUTC().toJSDate(),
        timezone: env.DEFAULT_TIMEZONE,
        status: BOOKING_STATUSES.CONFIRMED,
        notes: 'Reserva de demostracion proxima.',
        serviceName: mechanicServiceName,
        customerName: client2.name,
        professionalName: 'Taller Mecanico El Motor',
        idempotencyKey: 'seed-confirmed-booking',
        acceptedAt: new Date(),
        serviceLocationType: 'AT_BUSINESS',
      });
      const slots = buildSlots(
        upcomingStart.toUTC().toJSDate(),
        upcomingEnd.toUTC().toJSDate(),
        15,
      );
      await BookingSlotLock.insertMany(
        slots.map((slot) => ({
          professionalId: mechanic._id,
          bookingId: upcoming._id,
          slotStartAt: slot.start,
          lockStatus: 'CONFIRMED',
          expiresAt: null,
        })),
      );
      console.log('Reserva confirmada proxima creada con bloqueos.');
    }
  }

  const reportCustomers = [client, client2, client3];
  const reportCategories = ['MEC', 'CHA', 'GOM', 'ELA'];
  const demoHours = [9, 11, 14];

  for (const [categoryIndex, categoryCode] of reportCategories.entries()) {
    const professional = professionalUsers[categoryCode];
    const availableServices = professionalServices[categoryCode];
    const serviceName = Object.keys(availableServices ?? {})[0];
    if (!professional || !serviceName) continue;

    const serviceId = availableServices[serviceName];
    const service = await Service.findById(serviceId);
    if (!service) continue;
    const profile = await ProfessionalProfile.findOne({ userId: professional._id });
    const duration = Number(service.estimatedDurationMinutes || 60);

    for (const [customerIndex, customer] of reportCustomers.entries()) {
      const idempotencyKey = `seed-grafana-${categoryCode}-cliente-${customerIndex + 1}`;
      const pastStart = DateTime.now()
        .setZone(env.DEFAULT_TIMEZONE)
        .minus({ days: 2 + categoryIndex * 3 + customerIndex })
        .set({ hour: demoHours[customerIndex], minute: 0, second: 0, millisecond: 0 });
      const pastEnd = pastStart.plus({ minutes: duration });

      let demoBooking = await Booking.findOne({
        customerId: customer._id,
        idempotencyKey,
      });
      if (!demoBooking) {
        demoBooking = await Booking.create({
          customerId: customer._id,
          professionalId: professional._id,
          serviceId: service._id,
          startAt: pastStart.toUTC().toJSDate(),
          endAt: pastEnd.toUTC().toJSDate(),
          timezone: env.DEFAULT_TIMEZONE,
          status: BOOKING_STATUSES.COMPLETED,
          notes: 'Registro ficticio generado para visualizar los reportes de Grafana.',
          serviceName: service.name,
          customerName: customer.name,
          professionalName: profile?.businessName ?? professional.name,
          idempotencyKey,
          acceptedAt: pastStart.minus({ hours: 4 }).toUTC().toJSDate(),
          startedAt: pastStart.toUTC().toJSDate(),
          completedAt: pastEnd.toUTC().toJSDate(),
          serviceLocationType: 'AT_BUSINESS',
        });
      }

      const customerReview = await Review.findOne({
        bookingId: demoBooking._id,
        reviewerId: customer._id,
      });
      if (!customerReview) {
        await Review.create({
          bookingId: demoBooking._id,
          reviewerId: customer._id,
          revieweeId: professional._id,
          reviewerRole: ROLES.CLIENT,
          direction: REVIEW_DIRECTIONS.CUSTOMER_TO_PROFESSIONAL,
          rating: 4 + ((categoryIndex + customerIndex) % 2),
          comment: 'Resena ficticia de demostracion para validar el panel de categoria.',
          moderationStatus: MODERATION_STATUSES.PUBLISHED,
        });
      }

      const professionalReview = await Review.findOne({
        bookingId: demoBooking._id,
        reviewerId: professional._id,
      });
      if (!professionalReview) {
        await Review.create({
          bookingId: demoBooking._id,
          reviewerId: professional._id,
          revieweeId: customer._id,
          reviewerRole: ROLES.PROFESSIONAL,
          direction: REVIEW_DIRECTIONS.PROFESSIONAL_TO_CUSTOMER,
          rating: 4 + (customerIndex % 2),
          comment: 'Resena ficticia de demostracion para validar la calificacion mutua.',
          moderationStatus: MODERATION_STATUSES.PUBLISHED,
        });
      }
    }
  }
  console.log('Datos ficticios de reporte listos: reservas y calificaciones en las cuatro categorias.');

  const demoAuditEvents = [
    {
      action: 'AUTH_LOGIN',
      entityType: 'User',
      entityId: 'seed-grafana-demo-login',
      actorId: client._id,
    },
    {
      action: 'PROFESSIONAL_VERIFICATION_UPDATED',
      entityType: 'ProfessionalProfile',
      entityId: 'seed-grafana-demo-verification',
      actorId: admin._id,
    },
    {
      action: 'BOOKING_COMPLETED',
      entityType: 'Booking',
      entityId: 'seed-grafana-demo-completion',
      actorId: professionalUsers.MEC._id,
    },
    {
      action: 'REVIEW_MODERATED',
      entityType: 'Review',
      entityId: 'seed-grafana-demo-moderation',
      actorId: admin._id,
    },
  ];
  for (const event of demoAuditEvents) {
    const existingEvent = await AuditLog.findOne({
      action: event.action,
      entityId: event.entityId,
    });
    if (!existingEvent) {
      await AuditLog.create({
        ...event,
        result: 'SUCCESS',
        metadata: { demo: true, source: 'grafana-seed' },
      });
    }
  }

  for (const seed of professionalsSeed) {
    const user = professionalUsers[seed.categories[0]];
    if (user) await recalculateProfessionalRating(user.id);
  }
  for (const reportCustomer of reportCustomers) {
    await recalculateCustomerRating(reportCustomer.id);
  }

  console.log('\nDatos de acceso:');
  console.log(`  Admin:       ${admin.email} / ${env.ADMIN_PASSWORD}`);
  console.log('  Cliente:     cliente@skillfinder.bo / Cliente12345!');
  console.log('  Cliente 2:   cliente2@skillfinder.bo / Cliente12345!');
  console.log('  Cliente 3:   cliente3@skillfinder.bo / Cliente12345!');
  console.log('  Mecanico:    mecanico@skillfinder.bo / Pro123456!');
  console.log('  Chapero:     chapero@skillfinder.bo / Pro123456!');
  console.log('  Gomero:      gomero@skillfinder.bo / Pro123456!');
  console.log('  Electricista: electricista@skillfinder.bo / Pro123456!');
  console.log('\nSeed completado.');

  await disconnectDatabase();
};

main().catch(async (error) => {
  console.error('Error ejecutando el seed:', error);
  await disconnectDatabase();
  process.exit(1);
});
