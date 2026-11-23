import mongoose from 'mongoose';
import { BOOKING_STATUSES, VERIFICATION_STATUSES } from '@skillfinder/shared';
import {
  AuditLog,
  Booking,
  ContentEntry,
  ProfessionalProfile,
  Report,
  Review,
  Service,
  ServiceArea,
  ServiceCategory,
  Session,
  User,
  VerificationDocument,
  WeeklySchedule,
} from '../models';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/errors';
import {
  mapBooking,
  mapContentEntry,
  mapDocument,
  mapProfessional,
  mapReport,
  mapReview,
  mapSchedule,
  mapService,
  mapUser,
} from '../utils/mappers';
import { paginated, parsePagination } from '../utils/pagination';
import { notifyUser } from '../services/notifications';
import { refreshRatingForReviewee } from '../services/reviews';
import { resolvePrivateFile } from '../services/storage';
import { writeAuditLog } from '../utils/audit';

const escapeRegex = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const dashboard = asyncHandler(async (_req, res) => {
  const [
    clients,
    professionals,
    pendingProfessionals,
    approvedProfessionals,
    suspendedProfessionals,
    rejectedProfessionals,
    bookingsByStatus,
    recentBookings,
    pendingReports,
    distribution,
  ] = await Promise.all([
    User.countDocuments({ role: 'CLIENT' }),
    User.countDocuments({ role: 'PROFESSIONAL' }),
    ProfessionalProfile.countDocuments({
      verificationStatus: {
        $in: [
          VERIFICATION_STATUSES.PENDING_VERIFICATION,
          VERIFICATION_STATUSES.REQUIRES_CORRECTION,
        ],
      },
    }),
    ProfessionalProfile.countDocuments({
      verificationStatus: VERIFICATION_STATUSES.APPROVED,
    }),
    ProfessionalProfile.countDocuments({
      verificationStatus: VERIFICATION_STATUSES.SUSPENDED,
    }),
    ProfessionalProfile.countDocuments({
      verificationStatus: VERIFICATION_STATUSES.REJECTED,
    }),
    Booking.aggregate<{ _id: string; count: number }>([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    Booking.find().sort({ createdAt: -1 }).limit(10).lean(),
    Report.countDocuments({ status: 'OPEN' }),
    ProfessionalProfile.aggregate<{ _id: string; count: number }>([
      { $unwind: '$categories' },
      { $group: { _id: '$categories', count: { $sum: 1 } } },
    ]),
  ]);

  res.json({
    clients,
    professionals,
    pendingProfessionals,
    approvedProfessionals,
    suspendedProfessionals,
    rejectedProfessionals,
    bookingsByStatus: Object.fromEntries(
      bookingsByStatus.map((item) => [item._id, item.count]),
    ),
    recentBookings: recentBookings.map((booking) => mapBooking(booking)),
    pendingReports,
    distributionByCategory: Object.fromEntries(
      distribution.map((item) => [item._id, item.count]),
    ),
  });
});

export const listProfessionalsAdmin = asyncHandler(async (req, res) => {
  const query = req.query as unknown as {
    status?: string;
    search?: string;
  };
  const pagination = parsePagination(req.query as Record<string, unknown>);
  const filter: Record<string, unknown> = {};
  if (query.status) filter.verificationStatus = query.status;
  if (query.search) {
    const regex = { $regex: escapeRegex(query.search), $options: 'i' };
    filter.$or = [{ businessName: regex }, { displayName: regex }, { addressText: regex }];
  }

  const [profiles, total] = await Promise.all([
    ProfessionalProfile.find(filter)
      .sort({ createdAt: -1 })
      .skip(pagination.skip)
      .limit(pagination.pageSize)
      .lean(),
    ProfessionalProfile.countDocuments(filter),
  ]);

  const userIds = profiles.map((profile) => profile.userId);
  const users = await User.find({ _id: { $in: userIds } })
    .select('name email phone status')
    .lean();
  const userById = new Map(users.map((user) => [String(user._id), user]));

  res.json(
    paginated(
      profiles.map((profile) => {
        const user = userById.get(String(profile.userId));
        return {
          ...mapProfessional(profile),
          accountName: user?.name,
          accountEmail: user?.email,
          accountPhone: user?.phone,
        };
      }),
      total,
      pagination.page,
      pagination.pageSize,
    ),
  );
});

export const listPendingProfessionals = asyncHandler(async (req, res) => {
  const pagination = parsePagination(req.query as Record<string, unknown>);
  const filter = {
    verificationStatus: {
      $in: [
        VERIFICATION_STATUSES.PENDING_VERIFICATION,
        VERIFICATION_STATUSES.REQUIRES_CORRECTION,
      ],
    },
  };
  const [profiles, total] = await Promise.all([
    ProfessionalProfile.find(filter)
      .sort({ createdAt: 1 })
      .skip(pagination.skip)
      .limit(pagination.pageSize)
      .lean(),
    ProfessionalProfile.countDocuments(filter),
  ]);
  res.json(
    paginated(
      profiles.map((profile) => mapProfessional(profile)),
      total,
      pagination.page,
      pagination.pageSize,
    ),
  );
});

export const getProfessionalDetail = asyncHandler(async (req, res) => {
  const profile = await ProfessionalProfile.findById(req.params.id).lean();
  if (!profile) throw ApiError.notFound('Perfil profesional no encontrado.');
  const [user, documents, services, schedule] = await Promise.all([
    User.findById(profile.userId).lean(),
    VerificationDocument.find({ professionalId: profile.userId })
      .sort({ createdAt: -1 })
      .lean(),
    Service.find({ professionalId: profile.userId }).lean(),
    WeeklySchedule.find({ professionalId: profile.userId }).lean(),
  ]);

  res.json({
    profile: mapProfessional(profile, {
      services: services.map(mapService),
      weeklySchedule: schedule.map(mapSchedule),
      phone: user?.phone,
      email: user?.email,
    }),
    user: user ? mapUser(user) : null,
    documents: documents.map(mapDocument),
    verificationNotes: profile.verificationNotes,
  });
});

export const setVerification = asyncHandler(async (req, res) => {
  const body = req.body as {
    status: 'APPROVED' | 'REJECTED' | 'REQUIRES_CORRECTION';
    reason?: string;
  };
  const profile = await ProfessionalProfile.findById(req.params.id);
  if (!profile) throw ApiError.notFound('Perfil profesional no encontrado.');

  profile.verificationStatus = body.status as never;
  profile.isVisible = body.status === 'APPROVED';
  profile.verificationNotes = body.reason ?? '';
  profile.approvedAt = body.status === 'APPROVED' ? new Date() : null;
  await profile.save();

  if (body.status === 'APPROVED') {
    await VerificationDocument.updateMany(
      { professionalId: profile.userId, status: 'PENDING' },
      {
        $set: {
          status: 'APPROVED',
          reviewedBy: new mongoose.Types.ObjectId(req.user!.id),
          reviewedAt: new Date(),
        },
      },
    );
  }

  const title =
    body.status === 'APPROVED'
      ? 'Perfil aprobado'
      : 'Verificacion actualizada';
  await notifyUser({
    userId: String(profile.userId),
    type: `VERIFICATION_${body.status}`,
    title,
    message:
      body.status === 'APPROVED'
        ? 'Tu perfil profesional fue aprobado y ya es visible para los clientes.'
        : `El estado de tu verificacion cambio a ${body.status}. ${body.reason ?? ''}`,
    entityType: 'PROFESSIONAL_PROFILE',
    entityId: String(profile._id),
  });

  await writeAuditLog(
    {
      actorId: req.user!.id,
      action: 'PROFESSIONAL_VERIFICATION_UPDATED',
      entityType: 'PROFESSIONAL_PROFILE',
      entityId: String(profile._id),
      metadata: { status: body.status, reason: body.reason },
    },
    req,
  );

  res.json(mapProfessional(profile));
});

export const listDocumentsForProfessional = asyncHandler(async (req, res) => {
  const profile = await ProfessionalProfile.findById(req.params.id).lean();
  const professionalId = profile ? profile.userId : req.params.id;
  const documents = await VerificationDocument.find({
    professionalId,
  }).sort({ createdAt: -1 });
  res.json(documents.map(mapDocument));
});

export const reviewDocument = asyncHandler(async (req, res) => {
  const body = req.body as {
    status: 'APPROVED' | 'REJECTED' | 'REQUIRES_CORRECTION';
    rejectionReason?: string;
  };
  const document = await VerificationDocument.findById(req.params.id);
  if (!document) throw ApiError.notFound('Documento no encontrado.');

  document.status = body.status as never;
  document.reviewedBy = new mongoose.Types.ObjectId(req.user!.id);
  document.reviewedAt = new Date();
  document.rejectionReason = body.rejectionReason ?? null;
  await document.save();

  await notifyUser({
    userId: String(document.professionalId),
    type: `DOCUMENT_${body.status}`,
    title: 'Documento revisado',
    message:
      body.status === 'APPROVED'
        ? `El documento "${document.documentType}" fue aprobado.`
        : `El documento "${document.documentType}" requiere atencion: ${body.rejectionReason ?? body.status}.`,
    entityType: 'VERIFICATION_DOCUMENT',
    entityId: String(document._id),
  });

  await writeAuditLog(
    {
      actorId: req.user!.id,
      action: 'DOCUMENT_REVIEWED',
      entityType: 'VERIFICATION_DOCUMENT',
      entityId: String(document._id),
      metadata: { status: body.status },
    },
    req,
  );

  res.json(mapDocument(document));
});

export const downloadDocument = asyncHandler(async (req, res) => {
  const document = await VerificationDocument.findById(req.params.id);
  if (!document) throw ApiError.notFound('Documento no encontrado.');
  const filePath = resolvePrivateFile(document.storageReference);
  await writeAuditLog(
    {
      actorId: req.user!.id,
      action: 'DOCUMENT_DOWNLOADED',
      entityType: 'VERIFICATION_DOCUMENT',
      entityId: String(document._id),
    },
    req,
  );
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${document.originalName || 'documento'}"`,
  );
  res.sendFile(filePath);
});

export const listUsers = asyncHandler(async (req, res) => {
  const query = req.query as unknown as {
    role?: string;
    status?: string;
    search?: string;
  };
  const pagination = parsePagination(req.query as Record<string, unknown>);
  const filter: Record<string, unknown> = {};
  if (query.role) filter.role = query.role;
  if (query.status) filter.status = query.status;
  if (query.search) {
    const regex = { $regex: escapeRegex(query.search), $options: 'i' };
    filter.$or = [
      { name: regex },
      { email: regex },
      { phone: regex },
    ];
  }
  const [users, total] = await Promise.all([
    User.find(filter)
      .sort({ createdAt: -1 })
      .skip(pagination.skip)
      .limit(pagination.pageSize)
      .lean(),
    User.countDocuments(filter),
  ]);
  res.json(
    paginated(
      users.map(mapUser),
      total,
      pagination.page,
      pagination.pageSize,
    ),
  );
});

export const setUserStatus = asyncHandler(async (req, res) => {
  const body = req.body as {
    status: 'ACTIVE' | 'SUSPENDED' | 'BLOCKED';
    reason?: string;
  };
  const user = await User.findById(req.params.id);
  if (!user) throw ApiError.notFound('Usuario no encontrado.');
  if (String(user._id) === req.user!.id) {
    throw ApiError.unprocessable('No puedes cambiar el estado de tu propia cuenta.');
  }

  user.status = body.status;
  await user.save();

  if (body.status !== 'ACTIVE') {
    await Session.updateMany(
      { userId: user._id, revokedAt: null },
      { $set: { revokedAt: new Date() } },
    );
    if (user.role === 'PROFESSIONAL') {
      await ProfessionalProfile.updateOne(
        { userId: user._id },
        {
          $set: {
            isVisible: false,
            verificationStatus: VERIFICATION_STATUSES.SUSPENDED,
            verificationNotes: body.reason ?? '',
          },
        },
      );
    }
  } else if (user.role === 'PROFESSIONAL') {
    const profile = await ProfessionalProfile.findOne({ userId: user._id });
    if (profile) {
      profile.isVisible =
        profile.verificationStatus === VERIFICATION_STATUSES.APPROVED;
      await profile.save();
    }
  }

  await notifyUser({
    userId: user.id,
    type: 'ACCOUNT_STATUS_CHANGED',
    title: 'Estado de cuenta actualizado',
    message:
      body.status === 'ACTIVE'
        ? 'Tu cuenta fue reactivada.'
        : `Tu cuenta fue marcada como ${body.status}. ${body.reason ?? ''}`,
  });

  await writeAuditLog(
    {
      actorId: req.user!.id,
      action: 'USER_STATUS_UPDATED',
      entityType: 'USER',
      entityId: user.id,
      metadata: { status: body.status, reason: body.reason },
    },
    req,
  );

  res.json(mapUser(user));
});

export const listReports = asyncHandler(async (req, res) => {
  const query = req.query as unknown as { status?: string };
  const pagination = parsePagination(req.query as Record<string, unknown>);
  const filter: Record<string, unknown> = {};
  if (query.status) filter.status = query.status;
  const [reports, total] = await Promise.all([
    Report.find(filter)
      .sort({ createdAt: -1 })
      .skip(pagination.skip)
      .limit(pagination.pageSize)
      .lean(),
    Report.countDocuments(filter),
  ]);
  res.json(
    paginated(
      reports.map(mapReport),
      total,
      pagination.page,
      pagination.pageSize,
    ),
  );
});

export const resolveReport = asyncHandler(async (req, res) => {
  const body = req.body as {
    status: 'IN_REVIEW' | 'RESOLVED' | 'DISMISSED';
    resolution?: string;
  };
  const report = await Report.findById(req.params.id);
  if (!report) throw ApiError.notFound('Reporte no encontrado.');
  report.status = body.status;
  report.resolution = body.resolution ?? null;
  report.assignedAdminId = new mongoose.Types.ObjectId(req.user!.id);
  report.resolvedAt =
    body.status === 'RESOLVED' || body.status === 'DISMISSED'
      ? new Date()
      : null;
  await report.save();

  await notifyUser({
    userId: String(report.reporterId),
    type: 'REPORT_UPDATED',
    title: 'Tu reporte fue atendido',
    message: `El reporte cambio al estado ${body.status}. ${body.resolution ?? ''}`,
    entityType: 'REPORT',
    entityId: String(report._id),
  });

  await writeAuditLog(
    {
      actorId: req.user!.id,
      action: 'REPORT_RESOLVED',
      entityType: 'REPORT',
      entityId: String(report._id),
      metadata: { status: body.status },
    },
    req,
  );

  res.json(mapReport(report));
});

export const listReportedReviews = asyncHandler(async (req, res) => {
  const pagination = parsePagination(req.query as Record<string, unknown>);
  const filter = { reportCount: { $gt: 0 } };
  const [reviews, total] = await Promise.all([
    Review.find(filter)
      .sort({ reportCount: -1, createdAt: -1 })
      .skip(pagination.skip)
      .limit(pagination.pageSize)
      .lean(),
    Review.countDocuments(filter),
  ]);
  res.json(
    paginated(
      reviews.map((review) => mapReview(review)),
      total,
      pagination.page,
      pagination.pageSize,
    ),
  );
});

export const moderateReview = asyncHandler(async (req, res) => {
  const body = req.body as {
    status: 'PUBLISHED' | 'HIDDEN';
    note?: string;
  };
  const review = await Review.findById(req.params.id);
  if (!review) throw ApiError.notFound('Resena no encontrada.');
  review.moderationStatus = body.status;
  review.moderationNote = body.note ?? null;
  await review.save();

  await refreshRatingForReviewee(
    review.direction,
    String(review.revieweeId),
  );

  await writeAuditLog(
    {
      actorId: req.user!.id,
      action: 'REVIEW_MODERATED',
      entityType: 'REVIEW',
      entityId: String(review._id),
      metadata: { status: body.status },
    },
    req,
  );

  res.json(mapReview(review));
});

export const createCategory = asyncHandler(async (req, res) => {
  const body = req.body as {
    code?: string;
    name: string;
    description?: string;
    parentId?: string | null;
    sortOrder?: number;
  };

  if (!body.parentId) {
    throw ApiError.unprocessable(
      'Las cuatro categorias principales son fijas. Crea subespecialidades dentro de una categoria existente.',
    );
  }
  const parent = await ServiceCategory.findById(body.parentId);
  if (!parent || parent.parentId) {
    throw ApiError.badRequest('La categoria padre no es valida.');
  }

  const code =
    body.code?.toUpperCase() ??
    `${parent.code}-${body.name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .slice(0, 30)}-${Date.now().toString(36).slice(-4)}`;

  const category = await ServiceCategory.create({
    code,
    name: body.name,
    description: body.description ?? '',
    parentId: parent._id,
    isSpecialty: true,
    active: true,
    sortOrder: body.sortOrder ?? 0,
  });

  await writeAuditLog(
    {
      actorId: req.user!.id,
      action: 'CATEGORY_CREATED',
      entityType: 'SERVICE_CATEGORY',
      entityId: String(category._id),
    },
    req,
  );

  res.status(201).json({
    id: String(category._id),
    code: category.code,
    name: category.name,
    description: category.description,
    parentId: String(category.parentId),
    isSpecialty: true,
    active: category.active,
    sortOrder: category.sortOrder,
  });
});

export const updateCategory = asyncHandler(async (req, res) => {
  const body = req.body as {
    name?: string;
    description?: string;
    active?: boolean;
    sortOrder?: number;
  };
  const category = await ServiceCategory.findById(req.params.id);
  if (!category) throw ApiError.notFound('Categoria no encontrada.');
  if (body.name !== undefined) category.name = body.name;
  if (body.description !== undefined) category.description = body.description;
  if (body.active !== undefined) category.active = body.active;
  if (body.sortOrder !== undefined) category.sortOrder = body.sortOrder;
  await category.save();

  await writeAuditLog(
    {
      actorId: req.user!.id,
      action: 'CATEGORY_UPDATED',
      entityType: 'SERVICE_CATEGORY',
      entityId: String(category._id),
    },
    req,
  );

  res.json({
    id: String(category._id),
    code: category.code,
    name: category.name,
    description: category.description,
    parentId: category.parentId ? String(category.parentId) : null,
    isSpecialty: category.isSpecialty,
    active: category.active,
    sortOrder: category.sortOrder,
  });
});

export const listAuditLogs = asyncHandler(async (req, res) => {
  const query = req.query as unknown as {
    action?: string;
    entityType?: string;
  };
  const pagination = parsePagination(req.query as Record<string, unknown>);
  const filter: Record<string, unknown> = {};
  if (query.action) filter.action = query.action;
  if (query.entityType) filter.entityType = query.entityType;

  const [logs, total] = await Promise.all([
    AuditLog.find(filter)
      .sort({ createdAt: -1 })
      .skip(pagination.skip)
      .limit(pagination.pageSize)
      .lean(),
    AuditLog.countDocuments(filter),
  ]);

  res.json(
    paginated(
      logs.map((log) => ({
        id: String(log._id),
        actorId: log.actorId ? String(log.actorId) : null,
        action: log.action,
        entityType: log.entityType,
        entityId: log.entityId,
        result: log.result,
        metadata: log.metadata,
        createdAt: log.createdAt.toISOString(),
      })),
      total,
      pagination.page,
      pagination.pageSize,
    ),
  );
});

export const listServiceAreas = asyncHandler(async (_req, res) => {
  const areas = await ServiceArea.find().sort({ createdAt: 1 }).lean();
  res.json(
    areas.map((area) => ({
      id: String(area._id),
      code: area.code,
      name: area.name,
      municipality: area.municipality,
      department: area.department,
      country: area.country,
      boundary: area.boundary,
      active: area.active,
      sourceReference: area.sourceReference,
      updatedAt: area.updatedAt.toISOString(),
    })),
  );
});

export const updateServiceArea = asyncHandler(async (req, res) => {
  const body = req.body as {
    name?: string;
    boundary?: { type: 'Polygon'; coordinates: number[][][] };
    sourceReference?: string;
    active?: boolean;
  };
  const area = await ServiceArea.findById(req.params.id);
  if (!area) throw ApiError.notFound('Area de servicio no encontrada.');
  if (body.name) area.name = body.name;
  if (body.boundary) {
    const ring = body.boundary.coordinates[0];
    if (!ring || ring.length < 4) {
      throw ApiError.badRequest(
        'El poligono debe tener al menos 4 puntos y cerrar el anillo.',
      );
    }
    const first = ring[0];
    const last = ring[ring.length - 1];
    if (first[0] !== last[0] || first[1] !== last[1]) {
      throw ApiError.badRequest(
        'El anillo del poligono debe estar cerrado (primer y ultimo punto iguales).',
      );
    }
    area.boundary = body.boundary as never;
  }
  if (body.sourceReference !== undefined) {
    area.sourceReference = body.sourceReference;
  }
  if (body.active !== undefined) area.active = body.active;
  await area.save();

  await writeAuditLog(
    {
      actorId: req.user!.id,
      action: 'SERVICE_AREA_UPDATED',
      entityType: 'SERVICE_AREA',
      entityId: String(area._id),
    },
    req,
  );

  res.json({
    id: String(area._id),
    code: area.code,
    name: area.name,
    boundary: area.boundary,
    active: area.active,
    sourceReference: area.sourceReference,
    updatedAt: area.updatedAt.toISOString(),
  });
});

export const adminStatsByStatus = asyncHandler(async (_req, res) => {
  const [byStatus, bySpecialty] = await Promise.all([
    Booking.aggregate<{ _id: string; count: number }>([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    ProfessionalProfile.aggregate<{ _id: string; count: number }>([
      { $unwind: '$categories' },
      { $group: { _id: '$categories', count: { $sum: 1 } } },
    ]),
  ]);
  res.json({
    bookings: Object.fromEntries(byStatus.map((item) => [item._id, item.count])),
    professionals: Object.fromEntries(
      bySpecialty.map((item) => [item._id, item.count]),
    ),
    statuses: BOOKING_STATUSES,
  });
});



export const listContent = asyncHandler(async (_req, res) => {
  const entries = await ContentEntry.find().sort({ sortOrder: 1, key: 1 });
  res.json({ items: entries.map(mapContentEntry) });
});

export const createContent = asyncHandler(async (req, res) => {
  const body = req.body as {
    key: string;
    kind: 'FAQ' | 'POLICY' | 'INFO';
    title: string;
    body: string;
    items: { question: string; answer: string }[];
    published: boolean;
    sortOrder: number;
  };
  const existing = await ContentEntry.findOne({ key: body.key });
  if (existing) {
    throw ApiError.conflict('Ya existe un contenido con esa clave.');
  }
  const entry = await ContentEntry.create(body);
  await writeAuditLog(
    {
      actorId: req.user!.id,
      action: 'CONTENT_CREATED',
      entityType: 'CONTENT',
      entityId: String(entry._id),
      metadata: { key: entry.key },
    },
    req,
  );
  res.status(201).json({ entry: mapContentEntry(entry) });
});

export const updateContent = asyncHandler(async (req, res) => {
  const entry = await ContentEntry.findById(req.params.id);
  if (!entry) throw ApiError.notFound('Contenido no encontrado.');
  const body = req.body as Partial<{
    kind: 'FAQ' | 'POLICY' | 'INFO';
    title: string;
    body: string;
    items: { question: string; answer: string }[];
    published: boolean;
    sortOrder: number;
  }>;
  if (body.kind !== undefined) entry.kind = body.kind;
  if (body.title !== undefined) entry.title = body.title;
  if (body.body !== undefined) entry.body = body.body;
  if (body.items !== undefined) entry.set('items', body.items);
  if (body.published !== undefined) entry.published = body.published;
  if (body.sortOrder !== undefined) entry.sortOrder = body.sortOrder;
  await entry.save();
  await writeAuditLog(
    {
      actorId: req.user!.id,
      action: 'CONTENT_UPDATED',
      entityType: 'CONTENT',
      entityId: String(entry._id),
      metadata: { key: entry.key },
    },
    req,
  );
  res.json({ entry: mapContentEntry(entry) });
});

export const deleteContent = asyncHandler(async (req, res) => {
  const entry = await ContentEntry.findByIdAndDelete(req.params.id);
  if (!entry) throw ApiError.notFound('Contenido no encontrado.');
  await writeAuditLog(
    {
      actorId: req.user!.id,
      action: 'CONTENT_DELETED',
      entityType: 'CONTENT',
      entityId: String(entry._id),
      metadata: { key: entry.key },
    },
    req,
  );
  res.json({ message: 'Contenido eliminado.' });
});
