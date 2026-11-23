import mongoose, { Types } from 'mongoose';
import { DateTime } from 'luxon';
import {
  ACTIVE_BOOKING_STATUSES,
  LEADERBOARD_MIN_REVIEWS,
  MODERATION_STATUSES,
  REVIEW_DIRECTIONS,
  VERIFICATION_STATUSES,
  type AvailabilityException as AvailabilityExceptionDto,
  type WeeklyScheduleDay,
} from '@skillfinder/shared';
import { env } from '../config/env';
import {
  AvailabilityException,
  Booking,
  ProfessionalProfile,
  Report,
  Review,
  Service,
  ServiceCategory,
  User,
  VerificationDocument,
  WeeklySchedule,
} from '../models';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/errors';
import {
  mapBooking,
  mapException,
  mapProfessional,
  mapReview,
  mapSchedule,
  mapService,
} from '../utils/mappers';
import { haversineMeters, pointFromGeo, pointInPolygon, toGeoPoint } from '../utils/geo';
import { paginated, parsePagination } from '../utils/pagination';
import { dayKey, parseInstant, zoneOr } from '../utils/time';
import {
  getActiveServiceArea,
  resolveServiceAreaIdForPoint,
} from '../services/serviceAreas';
import { findNextAvailability, getAvailability } from '../services/availability';
import { publicUrlFor } from '../services/storage';
import { notifyUser } from '../services/notifications';
import { writeAuditLog } from '../utils/audit';

const escapeRegex = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const basePublicFilter = {
  verificationStatus: VERIFICATION_STATUSES.APPROVED,
  isVisible: true,
};

const resolveProfile = async (id: string) => {
  if (!mongoose.isValidObjectId(id)) {
    throw ApiError.badRequest('Identificador de profesional invalido.');
  }
  let profile = await ProfessionalProfile.findById(id);
  if (!profile) {
    profile = await ProfessionalProfile.findOne({ userId: id });
  }
  return profile;
};

const loadOwnerExtras = async (userId: Types.ObjectId, publicOnly: boolean) => {
  const [services, schedule, user] = await Promise.all([
    Service.find({
      professionalId: userId,
      ...(publicOnly ? { active: true } : {}),
    }).lean(),
    WeeklySchedule.find({ professionalId: userId }).lean(),
    User.findById(userId).select('phone email name').lean(),
  ]);
  return {
    services: services.map((service) => mapService(service)),
    weeklySchedule: schedule.map(mapSchedule),
    phone: user?.phone,
    email: user?.email,
  };
};

export const listProfessionals = asyncHandler(async (req, res) => {
  const query = req.query as unknown as {
    category?: string;
    specialty?: string;
    search?: string;
    minRating?: number;
    sort?: string;
  };
  const pagination = parsePagination(req.query as Record<string, unknown>);

  const filter: Record<string, unknown> = { ...basePublicFilter };
  if (query.category) filter.categories = query.category;
  if (query.specialty) {
    filter.specialties = {
      $regex: `^${escapeRegex(query.specialty)}`,
      $options: 'i',
    };
  }
  if (query.search) {
    const regex = { $regex: escapeRegex(query.search), $options: 'i' };
    filter.$or = [
      { businessName: regex },
      { displayName: regex },
      { description: regex },
      { specialties: regex },
    ];
  }
  if (query.minRating) {
    filter['ratingSummary.average'] = { $gte: query.minRating };
  }

  const sortMap: Record<string, Record<string, 1 | -1>> = {
    rating: { 'ratingSummary.average': -1, 'ratingSummary.count': -1 },
    name: { businessName: 1 },
    createdAt: { createdAt: -1 },
  };
  const sort = sortMap[query.sort ?? 'rating'] ?? sortMap.rating;

  const [items, total] = await Promise.all([
    ProfessionalProfile.find(filter).sort(sort).skip(pagination.skip).limit(pagination.pageSize).lean(),
    ProfessionalProfile.countDocuments(filter),
  ]);

  res.json(
    paginated(
      items.map((profile) => mapProfessional(profile)),
      total,
      pagination.page,
      pagination.pageSize,
    ),
  );
});

export const nearbyProfessionals = asyncHandler(async (req, res) => {
  const query = req.query as unknown as {
    latitude?: number;
    longitude?: number;
    radiusMeters?: number;
    category?: string;
    specialty?: string;
    search?: string;
    minRating?: number;
    sort?: string;
    includeNextAvailability?: string;
  };
  const pagination = parsePagination(req.query as Record<string, unknown>, 20, 50);

  const baseFilter: Record<string, unknown> = { ...basePublicFilter };
  if (query.category) baseFilter.categories = query.category;
  if (query.specialty) {
    baseFilter.specialties = {
      $regex: `^${escapeRegex(query.specialty)}`,
      $options: 'i',
    };
  }
  if (query.search) {
    const regex = { $regex: escapeRegex(query.search), $options: 'i' };
    baseFilter.$or = [
      { businessName: regex },
      { displayName: regex },
      { description: regex },
      { specialties: regex },
    ];
  }
  if (query.minRating) {
    baseFilter['ratingSummary.average'] = { $gte: query.minRating };
  }

  let items: Record<string, unknown>[] = [];
  const latitude = query.latitude;
  const longitude = query.longitude;
  const hasCoordinates =
    typeof latitude === 'number' &&
    typeof longitude === 'number' &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude);

  if (hasCoordinates) {
    const radius = query.radiusMeters ?? 8000;
    items = (await ProfessionalProfile.aggregate([
      {
        $geoNear: {
          near: {
            type: 'Point',
            coordinates: [longitude, latitude],
          },
          distanceField: 'distanceMeters',
          maxDistance: radius,
          spherical: true,
          query: baseFilter,
        },
      },
      { $limit: 300 },
    ])) as Record<string, unknown>[];
  } else {
    items = (await ProfessionalProfile.find(baseFilter)
      .sort({ 'ratingSummary.average': -1 })
      .limit(300)
      .lean()) as unknown as Record<string, unknown>[];
  }

  const area = await getActiveServiceArea();
  const polygon = area?.boundary as
    | { type: 'Polygon'; coordinates: number[][][] }
    | undefined;

  let filtered = items.filter((item) => {
    if (!polygon) return !env.PILOT_ENFORCE_BOUNDARY ? true : !area;
    const location = item.location as
      | { type: 'Point'; coordinates: number[] }
      | undefined;
    if (!location) return false;
    return pointInPolygon(location.coordinates[0], location.coordinates[1], polygon);
  });

  if (hasCoordinates) {
    const center = { latitude: query.latitude!, longitude: query.longitude! };
    filtered = filtered.map((item) => {
      const location = item.location as { coordinates: number[] };
      const distance =
        typeof item.distanceMeters === 'number'
          ? item.distanceMeters
          : haversineMeters(center, {
              latitude: location.coordinates[1],
              longitude: location.coordinates[0],
            });
      return { ...item, distanceMeters: Math.round(distance) };
    });
  }

  const sort = query.sort ?? (hasCoordinates ? 'distance' : 'rating');
  if (sort === 'distance' && hasCoordinates) {
    filtered.sort(
      (a, b) =>
        Number(a.distanceMeters ?? Number.MAX_SAFE_INTEGER) -
        Number(b.distanceMeters ?? Number.MAX_SAFE_INTEGER),
    );
  } else if (sort === 'rating') {
    filtered.sort((a, b) => {
      const aRating = (a.ratingSummary as { average?: number })?.average ?? 0;
      const bRating = (b.ratingSummary as { average?: number })?.average ?? 0;
      if (bRating !== aRating) return bRating - aRating;
      return String(a.businessName).localeCompare(String(b.businessName));
    });
  } else if (sort === 'name') {
    filtered.sort((a, b) =>
      String(a.businessName).localeCompare(String(b.businessName)),
    );
  }

  const total = filtered.length;
  const pageItems = filtered.slice(
    pagination.skip,
    pagination.skip + pagination.pageSize,
  );

  const withAvailability =
    query.includeNextAvailability === 'true' || sort === 'availability';

  const mapped = await Promise.all(
    pageItems.map(async (item) => {
      const base = mapProfessional(item, {
        distanceMeters:
          typeof item.distanceMeters === 'number' ? item.distanceMeters : undefined,
      });
      if (!withAvailability) return base;
      const next = await findNextAvailability(base.userId, 60, 14).catch(
        () => null,
      );
      return { ...base, nextAvailability: next };
    }),
  );

  if (sort === 'availability') {
    mapped.sort((a, b) => {
      if (!a.nextAvailability && !b.nextAvailability) return 0;
      if (!a.nextAvailability) return 1;
      if (!b.nextAvailability) return -1;
      return a.nextAvailability.localeCompare(b.nextAvailability);
    });
  }

  res.json(paginated(mapped, total, pagination.page, pagination.pageSize));
});

export const getProfessional = asyncHandler(async (req, res) => {
  const profile = await resolveProfile(req.params.id);
  if (!profile) throw ApiError.notFound('Profesional no encontrado.');

  const isOwner =
    req.user?.role === 'PROFESSIONAL' &&
    String(profile.userId) === req.user.id;
  const isAdmin = req.user?.role === 'ADMIN';
  const isPublic =
    profile.verificationStatus === VERIFICATION_STATUSES.APPROVED &&
    profile.isVisible;

  if (!isPublic && !isOwner && !isAdmin) {
    throw ApiError.notFound('Profesional no encontrado.');
  }

  const extras = await loadOwnerExtras(
    profile.userId,
    !isOwner && !isAdmin,
  );
  const nextAvailability = await findNextAvailability(
    String(profile.userId),
    60,
    21,
  ).catch(() => null);

  res.json({
    ...mapProfessional(profile, {
      services: extras.services,
      weeklySchedule: extras.weeklySchedule,
      nextAvailability,
      phone: isOwner || isAdmin ? extras.phone : undefined,
      email: isOwner || isAdmin ? extras.email : undefined,
    }),
  });
});

export const getMyProfile = asyncHandler(async (req, res) => {
  const profile = await ProfessionalProfile.findOne({ userId: req.user!.id });
  if (!profile) throw ApiError.notFound('No tienes un perfil profesional.');
  const extras = await loadOwnerExtras(profile.userId, false);
  res.json(
    mapProfessional(profile, {
      services: extras.services,
      weeklySchedule: extras.weeklySchedule,
      phone: extras.phone,
      email: extras.email,
    }),
  );
});

export const updateMyProfile = asyncHandler(async (req, res) => {
  const profile = await ProfessionalProfile.findOne({ userId: req.user!.id });
  if (!profile) throw ApiError.notFound('No tienes un perfil profesional.');

  const body = req.body as Record<string, unknown>;
  const allowed = [
    'displayName',
    'businessName',
    'description',
    'addressText',
    'categories',
    'specialties',
    'offersHomeService',
    'photoUrl',
  ];
  for (const key of allowed) {
    if (body[key] !== undefined) {
      (profile as unknown as Record<string, unknown>)[key] = body[key];
    }
  }
  await profile.save();
  await writeAuditLog(
    {
      actorId: req.user!.id,
      action: 'PROFILE_UPDATED',
      entityType: 'PROFESSIONAL_PROFILE',
      entityId: String(profile._id),
      metadata: { fields: Object.keys(body) },
    },
    req,
  );

  const extras = await loadOwnerExtras(profile.userId, false);
  res.json(
    mapProfessional(profile, {
      services: extras.services,
      weeklySchedule: extras.weeklySchedule,
      phone: extras.phone,
      email: extras.email,
    }),
  );
});

export const updateMyLocation = asyncHandler(async (req, res) => {
  const body = req.body as {
    latitude: number;
    longitude: number;
    addressText?: string;
  };
  const profile = await ProfessionalProfile.findOne({ userId: req.user!.id });
  if (!profile) throw ApiError.notFound('No tienes un perfil profesional.');

  let serviceAreaId: string | null;
  try {
    serviceAreaId = await resolveServiceAreaIdForPoint(
      body.longitude,
      body.latitude,
    );
  } catch (error) {
    throw ApiError.unprocessable((error as Error).message);
  }

  const wasApproved =
    profile.verificationStatus === VERIFICATION_STATUSES.APPROVED;
  profile.location = toGeoPoint(body) as never;
  if (body.addressText) profile.addressText = body.addressText;
  profile.serviceAreaId = serviceAreaId
    ? new Types.ObjectId(serviceAreaId)
    : null;
  if (wasApproved) {
    profile.verificationStatus = VERIFICATION_STATUSES.PENDING_VERIFICATION;
    profile.isVisible = false;
    profile.verificationNotes =
      'La ubicacion comercial cambio y requiere revision administrativa.';
  }
  await profile.save();

  await writeAuditLog(
    {
      actorId: req.user!.id,
      action: 'PROFILE_LOCATION_UPDATED',
      entityType: 'PROFESSIONAL_PROFILE',
      entityId: String(profile._id),
      metadata: { requiresReview: wasApproved },
    },
    req,
  );

  res.json(mapProfessional(profile));
});

export const getProfessionalServices = asyncHandler(async (req, res) => {
  const profile = await resolveProfile(req.params.id);
  if (!profile) throw ApiError.notFound('Profesional no encontrado.');
  const isOwner =
    req.user?.role === 'PROFESSIONAL' &&
    String(profile.userId) === req.user.id;
  const services = await Service.find({
    professionalId: profile.userId,
    ...(isOwner || req.user?.role === 'ADMIN' ? {} : { active: true }),
  }).lean();
  res.json(services.map((service) => mapService(service)));
});

export const listMyServices = asyncHandler(async (req, res) => {
  const services = await Service.find({ professionalId: req.user!.id }).lean();
  res.json(services.map((service) => mapService(service)));
});

const resolveCategory = async (code: string) => {
  const category = await ServiceCategory.findOne({
    code,
    parentId: null,
    active: true,
  });
  if (!category) {
    throw ApiError.badRequest('La categoria indicada no existe o esta inactiva.');
  }
  return category;
};

const resolveSpecialty = async (
  specialtyId: string | null | undefined,
  categoryId: Types.ObjectId,
) => {
  if (!specialtyId) return null;
  const specialty = await ServiceCategory.findById(specialtyId);
  if (
    !specialty ||
    !specialty.active ||
    String(specialty.parentId) !== String(categoryId)
  ) {
    throw ApiError.badRequest(
      'La subespecialidad no pertenece a la categoria indicada.',
    );
  }
  return specialty;
};

export const createMyService = asyncHandler(async (req, res) => {
  const body = req.body as {
    categoryCode: string;
    specialtyId?: string | null;
    specialtyName?: string | null;
    name: string;
    description?: string;
    estimatedDurationMinutes: number;
    estimatedPrice?: number | null;
    active?: boolean;
  };
  const category = await resolveCategory(body.categoryCode);
  const specialty = await resolveSpecialty(body.specialtyId, category._id);

  const service = await Service.create({
    professionalId: req.user!.id,
    categoryId: category._id,
    categoryCode: category.code,
    specialtyId: specialty?._id ?? null,
    specialtyName: specialty?.name ?? body.specialtyName ?? null,
    name: body.name,
    description: body.description ?? '',
    estimatedDurationMinutes: body.estimatedDurationMinutes,
    estimatedPrice: body.estimatedPrice ?? null,
    active: body.active ?? true,
  });

  res.status(201).json(mapService(service));
});

export const updateMyService = asyncHandler(async (req, res) => {
  const service = await Service.findOne({
    _id: req.params.serviceId,
    professionalId: req.user!.id,
  });
  if (!service) throw ApiError.notFound('Servicio no encontrado.');

  const body = req.body as Record<string, unknown>;
  if (body.categoryCode) {
    const category = await resolveCategory(String(body.categoryCode));
    service.categoryId = category._id as never;
    service.categoryCode = category.code;
    if (body.specialtyId !== undefined) {
      const specialty = await resolveSpecialty(
        body.specialtyId as string | null,
        category._id,
      );
      service.specialtyId = (specialty?._id ?? null) as never;
      service.specialtyName = specialty?.name ?? null;
    }
  }
  for (const key of [
    'name',
    'description',
    'estimatedDurationMinutes',
    'estimatedPrice',
    'active',
  ]) {
    if (body[key] !== undefined) {
      (service as unknown as Record<string, unknown>)[key] = body[key];
    }
  }
  await service.save();
  res.json(mapService(service));
});

export const uploadProfilePhoto = asyncHandler(async (req, res) => {
  if (!req.file) throw ApiError.badRequest('No se recibio ninguna imagen.');
  const profile = await ProfessionalProfile.findOne({ userId: req.user!.id });
  if (!profile) throw ApiError.notFound('No tienes un perfil profesional.');
  profile.photoUrl = publicUrlFor(req.file.filename);
  await profile.save();
  res.json({ photoUrl: profile.photoUrl });
});

export const listMyDocuments = asyncHandler(async (req, res) => {
  const documents = await VerificationDocument.find({
    professionalId: req.user!.id,
  }).sort({ createdAt: -1 });
  res.json(
    documents.map((doc) => ({
      id: String(doc._id),
      professionalId: String(doc.professionalId),
      documentType: doc.documentType,
      status: doc.status,
      rejectionReason: doc.rejectionReason,
      reviewedAt: doc.reviewedAt?.toISOString() ?? null,
      createdAt: doc.createdAt.toISOString(),
    })),
  );
});

export const uploadDocument = asyncHandler(async (req, res) => {
  if (!req.file) throw ApiError.badRequest('No se recibio ningun archivo.');
  const body = req.body as { documentType?: string };
  if (!body.documentType || body.documentType.trim().length < 2) {
    throw ApiError.badRequest('Indica el tipo de documento.');
  }
  const profile = await ProfessionalProfile.findOne({ userId: req.user!.id });
  if (!profile) throw ApiError.notFound('No tienes un perfil profesional.');

  const document = await VerificationDocument.create({
    professionalId: req.user!.id,
    documentType: body.documentType.trim(),
    storageReference: req.file.filename,
    originalName: req.file.originalname,
    mimeType: req.file.mimetype,
    size: req.file.size,
    status: 'PENDING',
  });

  res.status(201).json({
    id: String(document._id),
    documentType: document.documentType,
    status: document.status,
    createdAt: document.createdAt.toISOString(),
  });
});

export const getMySchedule = asyncHandler(async (req, res) => {
  const schedule = await WeeklySchedule.find({
    professionalId: req.user!.id,
  }).sort({ dayOfWeek: 1 });
  res.json(schedule.map(mapSchedule));
});

export const saveMySchedule = asyncHandler(async (req, res) => {
  const body = req.body as {
    days: {
      dayOfWeek: number;
      intervals: { start: string; end: string }[];
      breaks: { start: string; end: string }[];
      active: boolean;
    }[];
  };
  const timezone = env.DEFAULT_TIMEZONE;

  await Promise.all(
    body.days.map((day) =>
      WeeklySchedule.findOneAndUpdate(
        { professionalId: req.user!.id, dayOfWeek: day.dayOfWeek },
        {
          $set: {
            intervals: day.intervals.sort((a, b) => a.start.localeCompare(b.start)),
            breaks: day.breaks,
            active: day.active,
            timezone,
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      ),
    ),
  );

  await ProfessionalProfile.updateOne(
    { userId: req.user!.id },
    {
      $set: {
        scheduleSummary: body.days
          .filter((day) => day.active && day.intervals.length > 0)
          .map(
            (day) =>
              `${day.dayOfWeek}: ${day.intervals.map((i) => `${i.start}-${i.end}`).join(', ')}`,
          )
          .join(' | '),
      },
    },
  );

  const schedule = await WeeklySchedule.find({
    professionalId: req.user!.id,
  }).sort({ dayOfWeek: 1 });
  res.json(schedule.map(mapSchedule));
});

export const listMyExceptions = asyncHandler(async (req, res) => {
  const exceptions = await AvailabilityException.find({
    professionalId: req.user!.id,
    endAt: { $gte: new Date() },
  }).sort({ startAt: 1 });
  res.json(exceptions.map(mapException));
});

export const createMyException = asyncHandler(async (req, res) => {
  const body = req.body as {
    startAt: string;
    endAt: string;
    type: string;
    reason?: string;
  };
  const start = parseInstant(body.startAt);
  const end = parseInstant(body.endAt);
  if (start.toMillis() < Date.now() - 60 * 1000) {
    throw ApiError.unprocessable('El bloqueo no puede iniciar en el pasado.');
  }
  const exception = await AvailabilityException.create({
    professionalId: req.user!.id,
    startAt: start.toUTC().toJSDate(),
    endAt: end.toUTC().toJSDate(),
    type: body.type,
    reason: body.reason ?? '',
  });
  res.status(201).json(mapException(exception));
});

export const deleteMyException = asyncHandler(async (req, res) => {
  const exception = await AvailabilityException.findOneAndDelete({
    _id: req.params.id,
    professionalId: req.user!.id,
  });
  if (!exception) throw ApiError.notFound('Bloqueo no encontrado.');
  res.status(204).send();
});

export const getProfessionalAvailability = asyncHandler(async (req, res) => {
  const profile = await resolveProfile(req.params.id);
  if (!profile) throw ApiError.notFound('Profesional no encontrado.');
  const isOwner =
    req.user?.role === 'PROFESSIONAL' &&
    String(profile.userId) === req.user.id;
  if (
    (!isOwner && req.user?.role !== 'ADMIN') &&
    (profile.verificationStatus !== VERIFICATION_STATUSES.APPROVED ||
      !profile.isVisible)
  ) {
    throw ApiError.notFound('Profesional no encontrado.');
  }

  const query = req.query as unknown as {
    from: string;
    to: string;
    serviceId?: string;
    timezone?: string;
  };

  const availability = await getAvailability({
    professionalId: String(profile.userId),
    serviceId: query.serviceId ?? null,
    from: query.from,
    to: query.to,
    timezone: query.timezone ?? env.DEFAULT_TIMEZONE,
  });

  res.json(availability);
});

export const getMyCalendar = asyncHandler(async (req, res) => {
  const query = req.query as unknown as { from?: string; to?: string };
  const zone = env.DEFAULT_TIMEZONE;
  const now = DateTime.now().setZone(zone);
  const from = query.from ?? (now.startOf('day').toISODate() as string);
  const to =
    query.to ??
    (now.plus({ days: 30 }).endOf('day').toISODate() as string);

  const fromDate = DateTime.fromISO(from, { zone }).startOf('day');
  const toDate = DateTime.fromISO(to, { zone }).endOf('day');
  if (!fromDate.isValid || !toDate.isValid || toDate < fromDate) {
    throw ApiError.badRequest('Rango de calendario invalido.');
  }
  if (toDate.diff(fromDate, 'days').days > 92) {
    throw ApiError.badRequest('El rango maximo del calendario es de 92 dias.');
  }

  const [bookings, exceptions, schedule] = await Promise.all([
    Booking.find({
      professionalId: req.user!.id,
      startAt: { $gte: fromDate.toUTC().toJSDate(), $lte: toDate.toUTC().toJSDate() },
    })
      .sort({ startAt: 1 })
      .lean(),
    AvailabilityException.find({
      professionalId: req.user!.id,
      startAt: { $lte: toDate.toUTC().toJSDate() },
      endAt: { $gte: fromDate.toUTC().toJSDate() },
    })
      .sort({ startAt: 1 })
      .lean(),
    WeeklySchedule.find({ professionalId: req.user!.id })
      .sort({ dayOfWeek: 1 })
      .lean(),
  ]);

  const bookingsDto = bookings.map((booking) => mapBooking(booking));
  const exceptionsDto: AvailabilityExceptionDto[] = exceptions.map((exception) =>
    mapException(exception),
  );
  const scheduleDto: WeeklyScheduleDay[] = schedule.map(mapSchedule);

  res.json({
    timezone: zone,
    from,
    to,
    bookings: bookingsDto,
    exceptions: exceptionsDto,
    schedule: scheduleDto,
    pendingCount: bookingsDto.filter(
      (booking) => booking.status === 'PENDING_PROFESSIONAL',
    ).length,
    upcoming: bookingsDto.filter(
      (booking) =>
        ACTIVE_BOOKING_STATUSES.includes(booking.status) &&
        parseInstant(booking.startAt).toMillis() >= now.toMillis(),
    ),
  });
});

export const listProfessionalReviews = asyncHandler(async (req, res) => {
  const profile = await resolveProfile(req.params.id);
  if (!profile) throw ApiError.notFound('Profesional no encontrado.');
  const pagination = parsePagination(req.query as Record<string, unknown>);

  const filter = {
    revieweeId: profile.userId,
    direction: 'CUSTOMER_TO_PROFESSIONAL',
    moderationStatus: 'PUBLISHED',
  };
  const [reviews, total] = await Promise.all([
    Review.find(filter)
      .sort({ createdAt: -1 })
      .skip(pagination.skip)
      .limit(pagination.pageSize)
      .lean(),
    Review.countDocuments(filter),
  ]);

  const reviewerIds = [...new Set(reviews.map((review) => String(review.reviewerId)))];
  const reviewers = await User.find({ _id: { $in: reviewerIds } })
    .select('name')
    .lean();
  const nameById = new Map(reviewers.map((user) => [String(user._id), user.name]));

  res.json(
    paginated(
      reviews.map((review) =>
        mapReview(review, nameById.get(String(review.reviewerId))),
      ),
      total,
      pagination.page,
      pagination.pageSize,
    ),
  );
});

export const reportReview = asyncHandler(async (req, res) => {
  const review = await Review.findById(req.params.id);
  if (!review) throw ApiError.notFound('Resena no encontrada.');
  const body = req.body as { reason?: string; description?: string };
  review.reportCount += 1;
  await review.save();

  await Report.create({
    reporterId: req.user!.id,
    targetType: 'REVIEW',
    targetId: String(review._id),
    reason: body.reason ?? 'Resena reportada',
    description: body.description ?? '',
    status: 'OPEN',
  });

  await notifyUser({
    userId: req.user!.id,
    type: 'REPORT_RECEIVED',
    title: 'Reporte recibido',
    message: 'Gracias por informar. El equipo revisara la resena.',
    entityType: 'REVIEW',
    entityId: String(review._id),
  });

  res.status(201).json({ message: 'Reporte registrado.' });
});

export const professionalDayKey = dayKey;
export const professionalZone = zoneOr;
export const pointForProfile = pointFromGeo;

export const weeklyLeaderboard = asyncHandler(async (_req, res) => {
  const now = DateTime.now().setZone(env.DEFAULT_TIMEZONE);
  const periodStart = now.minus({ days: 7 }).toUTC().toJSDate();
  const periodEnd = now.toUTC().toJSDate();

  const grouped = await Review.aggregate<{
    _id: Types.ObjectId;
    average: number;
    count: number;
  }>([
    {
      $match: {
        direction: REVIEW_DIRECTIONS.CUSTOMER_TO_PROFESSIONAL,
        moderationStatus: MODERATION_STATUSES.PUBLISHED,
        createdAt: { $gte: periodStart, $lte: periodEnd },
      },
    },
    {
      $group: {
        _id: '$revieweeId',
        average: { $avg: '$rating' },
        count: { $sum: 1 },
      },
    },
    { $match: { count: { $gte: LEADERBOARD_MIN_REVIEWS } } },
    { $sort: { average: -1, count: -1 } },
  ]);

  if (grouped.length === 0) {
    res.json({
      items: [],
      minimumReviews: LEADERBOARD_MIN_REVIEWS,
      periodStart: periodStart.toISOString(),
      periodEnd: periodEnd.toISOString(),
      message:
        `Aun no hay profesionales con al menos ${LEADERBOARD_MIN_REVIEWS} resenas publicadas esta semana.`,
    });
    return;
  }

  const ids = grouped.map((item) => item._id);
  const [profiles, completed] = await Promise.all([
    ProfessionalProfile.find({
      userId: { $in: ids },
      ...basePublicFilter,
    }).lean(),
    Booking.aggregate<{ _id: Types.ObjectId; count: number }>([
      {
        $match: {
          professionalId: { $in: ids },
          status: 'COMPLETED',
          startAt: { $gte: periodStart, $lte: periodEnd },
        },
      },
      { $group: { _id: '$professionalId', count: { $sum: 1 } } },
    ]),
  ]);

  const profileByUser = new Map(
    profiles.map((profile) => [String(profile.userId), profile]),
  );
  const completedByUser = new Map(
    completed.map((item) => [String(item._id), item.count]),
  );

  const items = grouped
    .map((item) => {
      const profile = profileByUser.get(String(item._id));
      if (!profile) return null;
      return {
        ...mapProfessional(profile),
        weeklyAverage: Math.round(item.average * 100) / 100,
        weeklyReviews: item.count,
        completedBookings: completedByUser.get(String(item._id)) ?? 0,
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
    .sort(
      (a, b) =>
        b.weeklyAverage - a.weeklyAverage ||
        b.weeklyReviews - a.weeklyReviews ||
        b.completedBookings - a.completedBookings,
    )
    .slice(0, 20);

  res.json({
    items,
    minimumReviews: LEADERBOARD_MIN_REVIEWS,
    periodStart: periodStart.toISOString(),
    periodEnd: periodEnd.toISOString(),
    ...(items.length === 0
      ? {
          message:
            'Los profesionales de la semana ya no estan disponibles publicamente.',
        }
      : {}),
  });
});
